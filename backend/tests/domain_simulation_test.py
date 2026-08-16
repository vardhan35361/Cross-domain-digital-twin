"""Cross-domain simulation self-test.
Verifies every domain initialises, ticks, and produces coherent KPIs."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from twins import init_all_domains, tick_all_domains, KPI_FNS, DOMAINS

def main():
    store = init_all_domains()
    assert set(store.keys()) == {"hospital", "building", "industrial", "energy", "water"}, "missing domain"
    for _ in range(30):
        tick_all_domains(store)
    failures = []
    for domain, state in store.items():
        try:
            kpis = KPI_FNS[domain](state)
        except Exception as e:
            failures.append(f"{domain}: KPI computation error {e}")
            continue
        assert state["tick"] == 30, f"{domain} tick not incrementing"
        assert state["running"] is True, f"{domain} running should default True"
        assert isinstance(kpis, dict) and len(kpis) >= 4, f"{domain} kpis empty"
        assert DOMAINS[domain]["scenarios"], f"{domain} scenarios missing"
        print(f"OK {domain}: tick={state['tick']} kpis={len(kpis)} scenario={state['scenario']}")
    if failures:
        print("FAILURES:", failures); sys.exit(1)
    print("ALL DOMAIN SIMULATIONS OK")

if __name__ == "__main__":
    main()
