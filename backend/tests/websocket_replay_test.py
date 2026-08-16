"""Rolling history buffer / replay self-test."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from twins import init_all_domains, tick_all_domains, record_history, history_slice, HISTORY

def main():
    store = init_all_domains()
    for _ in range(60):
        tick_all_domains(store)
        for domain, dstate in store.items():
            record_history(domain, dstate)

    for domain in ("hospital", "building", "industrial", "energy", "water"):
        frames = history_slice(domain, 60)
        assert len(frames) == 60, f"{domain} expected 60 frames, got {len(frames)}"
        assert frames[0]["tick"] < frames[-1]["tick"], "history not ordered"
        assert "kpis" in frames[0] and "state" in frames[0]
        print(f"OK {domain}: {len(frames)} frames (tick {frames[0]['tick']}→{frames[-1]['tick']})")
    print("ALL REPLAY BUFFERS OK")

if __name__ == "__main__":
    main()
