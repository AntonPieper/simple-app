import { For, createSignal } from "solid-js";

function App() {
  const [counterID, setCounterID] = createSignal(0);

  return (
    <>
      Select DB ID:
      <select onChange={(ev) => setCounterID(+ev.target.value)}>
        <For each={Array.from({ length: 10 }, (_, i) => i)}>
          {(i) => (
            <option value={i} selected={i === counterID()}>
              {i}
            </option>
          )}
        </For>
      </select>
    </>
  );
}

export default App;
