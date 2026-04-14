import React from "react";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";
import WorkspaceLayout from "./components/WorkspaceLayout/WorkspaceLayout";

export default function App() {
  const [ready, setReady] = React.useState(false);

  if (!ready) {
    return <LoadingScreen onReady={() => setReady(true)} />;
  }

  return <WorkspaceLayout />;
}
