import os, json, requests, pytest
import asyncio
import websockets
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL') or next(
    line.split('=', 1)[1].strip() for line in open('/app/frontend/.env')
    if line.startswith('REACT_APP_BACKEND_URL=')
)
BASE_URL = BASE_URL.rstrip('/')

@pytest.fixture(scope='module')
def client():
    return requests.Session()

def test_core_gets(client):
    for path in ['/api/health','/api/overview','/api/zones','/api/roads','/api/vehicles','/api/incidents','/api/predictions','/api/analytics/trend','/api/weather']:
        r=client.get(BASE_URL+path, timeout=15); assert r.status_code==200, (path,r.text)
        assert r.json() is not None

def test_incident_lifecycle(client):
    r=client.post(BASE_URL+'/api/incidents',json={'type':'TEST Accident','location':'TEST Road','severity':'high','impact':'TEST impact'},timeout=15)
    assert r.status_code==200; item=r.json(); assert item['location']=='TEST Road' and item['status']=='active'
    rr=client.post(BASE_URL+f"/api/incidents/{item['id']}/resolve",timeout=15)
    assert rr.status_code==200 and rr.json()['status']=='resolved'
    missing = client.post(BASE_URL+'/api/incidents/INC-DOES-NOT-EXIST/resolve', timeout=15)
    assert missing.status_code == 404

def test_emergency_route(client):
    r=client.post(BASE_URL+'/api/emergency/routes',json={'origin':'Gachibowli','destination':'HITEC City','vehicle_type':'Ambulance'},timeout=15)
    assert r.status_code==200; d=r.json(); assert d['eta_minutes']>0 and d['green_corridor'] is True and d['status']=='DISPATCHED'

def test_simulation_control(client):
    r=client.post(BASE_URL+'/api/simulation/control',json={'running':False,'scenario':'Rainstorm','weather':'Rainstorm'},timeout=15)
    assert r.status_code==200 and r.json()['running'] is False and r.json()['weather']=='Rainstorm'
    r=client.post(BASE_URL+'/api/simulation/control',json={'running':True,'scenario':'Office hours','weather':'Clear'},timeout=15)
    assert r.status_code==200 and r.json()['running'] is True

def test_assistant_fallback_or_stream(client):
    with client.post(BASE_URL+'/api/assistant/stream',json={'message':'Where is the bottleneck?'},stream=True,timeout=45) as r:
        assert r.status_code==200
        body=b''.join(r.iter_content()).decode(); assert 'AIRA' in body or 'congestion' in body.lower()

def test_websocket_snapshot():
    async def receive_snapshot():
        ws_url = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/api/ws/traffic'
        async with websockets.connect(ws_url, open_timeout=15) as socket:
            return json.loads(await asyncio.wait_for(socket.recv(), timeout=15))
    snapshot = asyncio.run(receive_snapshot())
    assert 'metrics' in snapshot and 'vehicles' in snapshot and len(snapshot['vehicles']) > 0
