import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useDomainWs } from "../state/WsProvider";

/** Consumes multiplexed WS snapshot + falls back to REST if socket lags. */
export function useDomainSnapshot(domain) {
  const { snapshot, status } = useDomainWs(domain);
  const [rest, setRest] = useState(null);
  const [error, setError] = useState(null);
  const [replayFrame, setReplayFrame] = useState(null); // when replay scrubs, we overlay this

  useEffect(() => {
    let alive = true;
    api.twin(domain)
      .then(d => alive && setRest(d))
      .catch(e => alive && setError(e.response?.data?.detail || e.message));
    return () => { alive = false; };
  }, [domain]);

  const active = replayFrame
    ? { state: replayFrame.state, kpis: replayFrame.kpis, tick: replayFrame.tick,
        scenario: replayFrame.scenario, running: replayFrame.running,
        replay: true, at: replayFrame.at }
    : (snapshot || rest);

  return {
    state: active?.state, kpis: active?.kpis || {}, tick: active?.tick,
    scenario: active?.scenario, running: active?.running,
    isReplay: !!replayFrame, applyReplayFrame: setReplayFrame,
    clearReplay: () => setReplayFrame(null),
    status, error, ready: !!active,
  };
}
