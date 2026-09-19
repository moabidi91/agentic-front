import { Navigate, Route, Routes } from 'react-router-dom';
import { useBranding } from './branding/BrandingProvider';
import { useSession } from './session/SessionContext';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { SignInScreen } from './screens/signin/SignInScreen';
import { ConnectingScreen } from './screens/ConnectingScreen';
import { ChatScreen } from './screens/ChatScreen';
import { DebugScreen } from './screens/DebugScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { StateMachineScreen } from './screens/StateMachineScreen';
import { LiveDatabaseScreen } from './screens/LiveDatabaseScreen';

function RequireBranding({ children }: { children: React.ReactElement }) {
  const { hasChosenBranding } = useBranding();
  if (!hasChosenBranding) return <Navigate to="/welcome" replace />;
  return children;
}

function RequireSession({ children }: { children: React.ReactElement }) {
  const { hasChosenBranding } = useBranding();
  const { connection } = useSession();
  if (!hasChosenBranding) return <Navigate to="/welcome" replace />;
  if (!connection) return <Navigate to="/signin" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/welcome" replace />} />
      <Route path="/welcome" element={<WelcomeScreen />} />
      <Route
        path="/signin"
        element={
          <RequireBranding>
            <SignInScreen />
          </RequireBranding>
        }
      />
      <Route
        path="/connecting"
        element={
          <RequireBranding>
            <ConnectingScreen />
          </RequireBranding>
        }
      />
      <Route
        path="/chat"
        element={
          <RequireSession>
            <ChatScreen />
          </RequireSession>
        }
      />
      <Route
        path="/debug"
        element={
          <RequireSession>
            <DebugScreen />
          </RequireSession>
        }
      />
      <Route
        path="/history"
        element={
          <RequireSession>
            <HistoryScreen />
          </RequireSession>
        }
      />
      <Route
        path="/state-machine"
        element={
          <RequireBranding>
            <StateMachineScreen />
          </RequireBranding>
        }
      />
      <Route
        path="/live-database"
        element={
          <RequireBranding>
            <LiveDatabaseScreen />
          </RequireBranding>
        }
      />
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  );
}
