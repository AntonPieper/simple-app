import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  untrack,
} from "solid-js";
import { createStore } from "solid-js/store";

function App() {
  const [counterID, setCounterID] = createSignal(history.state ?? 1);
  const [count, setCount] = createStore<Record<number, number>>();
  createEffect(() => {
    const id = counterID();
    if (id !== history.state) {
      history.pushState(id, "", `/${id}`);
    }
  });
  function popstate(this: Window, ev: PopStateEvent) {
    if (typeof ev.state === "number") {
      setCounterID(ev.state);
    } else {
      console.warn("Invalid history state:", ev.state);
    }
  }
  addEventListener("popstate", popstate);
  onCleanup(() => {
    removeEventListener("popstate", popstate);
  });

  createEffect(() => {
    const url = `/api/${counterID()}`;
    console.log(`connecting to ${url}`);
    const stream = new EventSource(url);
    function close() {
      stream.onerror = null;
      stream.onmessage = null;
      stream.onopen = null;
      stream.close();
    }
    onCleanup(() => {
      console.log("deleting eventstream");
      close();
    });
    stream.onmessage = (ev) => {
      console.log("message:", ev);
      setCount(untrack(counterID), +ev.data);
    };
    stream.onerror = (ev) => {
      console.error("error:", ev);
      close();
    };
    stream.onopen = (ev) => {
      console.log("connected:", ev);
      stream.onopen = null;
    };
    console.log("created eventstream");
  });
  return (
    <>
      Select Counter:
      <select onChange={(ev) => setCounterID(+ev.target.value)}>
        <For each={Array.from({ length: 10 }, (_, i) => i + 1)}>
          {(i) => (
            <option value={i} selected={i === counterID()}>
              Counter {i}
            </option>
          )}
        </For>
      </select>
      <button
        onClick={() => {
          const id = untrack(counterID);
          fetch(`/api/${id}/add`, { method: "POST" })
            .then(() => console.log("Successfully fetched"))
            .catch((err) => console.error(err));
          setCount(id, (v) => (v === undefined ? NaN : v + 1));
        }}
      >
        <Show fallback="No Count" when={Number.isFinite(count[counterID()])}>
          Count: {count[counterID()].toString()}
        </Show>
      </button>
    </>
  );
}

export default App;
