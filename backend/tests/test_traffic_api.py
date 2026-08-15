import os, json, requests, pytest, asyncio, websockets

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL') or next(
    line.split('=', 1)[1].strip() for line in open('/app/frontend/.env')
    if line.startswith('REACT_APP_BACKEND_URL=')
)
BASE_URL = BASE_URL.rstrip('/')


@pytest.fixture(scope='module')
def client():
    return requests.Session()


# --- Core GETs ---
def test_health_ok(client):
    r = client.get(BASE_URL + '/api/health', timeout=15)
    assert r.status_code == 200 and r.json()['status'] == 'ok'


def test_core_gets(client):
    for path in ['/api/overview', '/api/incidents', '/api/predictions',
                 '/api/analytics/trend', '/api/weather', '/api/simulation/status', '/api/replay']:
        r = client.get(BASE_URL + path, timeout=15)
        assert r.status_code == 200, (path, r.text)
        assert r.json() is not None


# --- Metropolitan scale ---
def test_zones_24(client):
    r = client.get(BASE_URL + '/api/zones', timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) == 24, f"expected 24 zones, got {len(data)}"
    assert all('name' in z and 'pos' in z for z in data)


def test_roads_37(client):
    r = client.get(BASE_URL + '/api/roads', timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) == 37, f"expected 37 roads, got {len(data)}"
    assert all('id' in road and 'lanes' in road and 'congestion' in road for road in data)


def test_vehicles_available(client):
    r = client.get(BASE_URL + '/api/vehicles', timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) > 100, f"expected many vehicles, got {len(data)}"


# --- New endpoints ---
def test_heatmap_bands(client):
    r = client.get(BASE_URL + '/api/heatmap', timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert 'segments' in d and len(d['segments']) == 37
    bands = {seg['band'] for seg in d['segments']}
    assert bands.issubset({'green', 'yellow', 'orange', 'red'})
    for seg in d['segments']:
        assert 'saturation' in seg and 'pulse' in seg and 'road_id' in seg


def test_layers_get_and_toggle(client):
    r = client.get(BASE_URL + '/api/layers', timeout=15)
    assert r.status_code == 200
    layers = r.json()
    assert isinstance(layers, dict) and len(layers) > 0
    # Pick a layer & toggle
    key = next(iter(layers))
    original = layers[key]
    rr = client.post(BASE_URL + '/api/layers', json={'layer': key, 'enabled': not original}, timeout=15)
    assert rr.status_code == 200
    assert rr.json()[key] is (not original)
    # Restore
    client.post(BASE_URL + '/api/layers', json={'layer': key, 'enabled': original}, timeout=15)
    # Unknown layer
    bad = client.post(BASE_URL + '/api/layers', json={'layer': 'not-a-layer', 'enabled': True}, timeout=15)
    assert bad.status_code == 404


def test_analytics_zones(client):
    r = client.get(BASE_URL + '/api/analytics/zones', timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) > 0
    assert all('zone' in z and 'congestion' in z for z in data)


def test_analytics_peak_hours(client):
    r = client.get(BASE_URL + '/api/analytics/peak-hours', timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) > 10
    assert all('hour' in h and 'index' in h for h in data)


def test_system_health(client):
    r = client.get(BASE_URL + '/api/system/health', timeout=15)
    assert r.status_code == 200
    d = r.json()
    for key in ['backend', 'websocket', 'database', 'simulation', 'api_latency_ms', 'cpu_percent']:
        assert key in d, key
    assert 'p50' in d['api_latency_ms'] and 'p95' in d['api_latency_ms'] and 'p99' in d['api_latency_ms']


def test_signals_adjust(client):
    roads = client.get(BASE_URL + '/api/roads', timeout=15).json()
    road_id = roads[0]['id']
    r = client.post(BASE_URL + '/api/signals/adjust',
                    json={'road_id': road_id, 'green_duration': 72, 'mode': 'override'}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d['applied'] is True and d['green_duration'] == 72 and d['mode'] == 'override'
    # 404 on unknown
    bad = client.post(BASE_URL + '/api/signals/adjust',
                      json={'road_id': 'ROAD-XYZ', 'green_duration': 60, 'mode': 'adaptive'}, timeout=15)
    assert bad.status_code == 404


# --- Convoy lifecycle ---
def test_convoy_lifecycle(client):
    # Start
    r = client.post(BASE_URL + '/api/convoy/start',
                    json={'waypoints': ['Financial District', 'HITEC City', 'Jubilee Hills', 'Secunderabad'],
                          'dignitary': 'Test VIP', 'vehicle_type': 'VIP convoy', 'priority': 'highest'}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d['status'] == 'active' and d['id'].startswith('VIP-')
    assert len(d['waypoints']) == 4 and len(d['waypoint_positions']) == 4

    # Pause
    r = client.post(BASE_URL + '/api/convoy/pause', timeout=15)
    assert r.status_code == 200 and r.json()['status'] == 'paused'

    # Resume
    r = client.post(BASE_URL + '/api/convoy/resume', timeout=15)
    assert r.status_code == 200 and r.json()['status'] == 'active'

    # Status
    r = client.get(BASE_URL + '/api/convoy/status', timeout=15)
    assert r.status_code == 200 and r.json()['status'] == 'active'

    # Cancel
    r = client.post(BASE_URL + '/api/convoy/cancel', timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d['signals_restored'] is True

    # Idle after cancel
    r = client.get(BASE_URL + '/api/convoy/status', timeout=15)
    assert r.json()['status'] == 'idle'


# --- Emergency + replay corridor lifecycle ---
def test_emergency_route_and_replay(client):
    r = client.post(BASE_URL + '/api/emergency/routes',
                    json={'origin': 'Gachibowli', 'destination': 'HITEC City', 'vehicle_type': 'Ambulance'}, timeout=15)
    assert r.status_code == 200
    corridor = r.json()
    assert corridor['status'] == 'DISPATCHED' and corridor['green_corridor'] is True
    assert 'waypoints' in corridor and len(corridor['waypoints']) >= 2
    route_id = corridor['route_id']

    # Corridor lists
    r = client.get(BASE_URL + '/api/replay/corridors', timeout=15)
    assert r.status_code == 200
    ids = [c['route_id'] for c in r.json()]
    assert route_id in ids

    # Detail
    r = client.get(BASE_URL + f'/api/replay/corridors/{route_id}', timeout=15)
    assert r.status_code == 200
    detail = r.json()
    assert detail['route_id'] == route_id
    assert 'frames' in detail and isinstance(detail['frames'], list) and len(detail['frames']) > 0
    assert 'waypoints' in detail

    # 404 unknown
    r = client.get(BASE_URL + '/api/replay/corridors/ROUTE-DOES-NOT-EXIST', timeout=15)
    assert r.status_code == 404


# --- Live seeded fallback ---
def test_live_status_seeded(client):
    r = client.get(BASE_URL + '/api/live/status', timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert 'feeds' in data
    for feed in ['traffic', 'weather', 'cctv', 'signals', 'dispatch']:
        assert feed in data['feeds'], feed
        assert data['feeds'][feed]['live'] is False
        assert data['feeds'][feed]['fallback'] is True
        # health field may be 'seeded' per problem statement
        assert data['feeds'][feed].get('health') in (None, 'seeded', 'degraded', 'ok')


def test_weather_seeded(client):
    r = client.get(BASE_URL + '/api/weather', timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d.get('provider') == 'seeded simulation' and d.get('live') is False


def test_incident_lifecycle(client):
    r = client.post(BASE_URL + '/api/incidents',
                    json={'type': 'TEST Accident', 'location': 'TEST Road', 'severity': 'high', 'impact': 'x'},
                    timeout=15)
    assert r.status_code == 200
    item = r.json()
    assert item['status'] == 'active'
    rr = client.post(BASE_URL + f"/api/incidents/{item['id']}/resolve", timeout=15)
    assert rr.status_code == 200 and rr.json()['status'] == 'resolved'


def test_assistant_stream(client):
    with client.post(BASE_URL + '/api/assistant/stream',
                     json={'message': 'Where is the bottleneck?'}, stream=True, timeout=45) as r:
        assert r.status_code == 200
        body = b''.join(r.iter_content()).decode()
        assert len(body) > 0


# --- WebSocket ---
def test_websocket_snapshot_envelope():
    async def receive():
        ws_url = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/api/ws/traffic'
        async with websockets.connect(ws_url, open_timeout=15) as socket:
            return json.loads(await asyncio.wait_for(socket.recv(), timeout=15))
    msg = asyncio.run(receive())
    # Should be wrapped: {kind, data}
    assert 'kind' in msg and 'data' in msg
    assert msg['kind'] == 'snapshot'
    data = msg['data']
    assert 'roads' in data and 'vehicles' in data and 'heatmap' in data and 'layers' in data
