import './App.css';
import { useAuth } from './hooks/useAuth';
import { useRouter } from './hooks/useRouter';
import { LoginScreen } from './screens/LoginScreen';
import { ConnectMetaScreen } from './screens/ConnectMetaScreen';
import { HomeScreen } from './screens/HomeScreen';
import { TemplatesScreen } from './screens/TemplatesScreen';
import { TemplateFormScreen } from './screens/TemplateFormScreen';
import { SchedulesScreen } from './screens/SchedulesScreen';
import { ScheduleFormScreen } from './screens/ScheduleFormScreen';
import { AiScreen } from './screens/AiScreen';
import { SettingsScreen } from './screens/SettingsScreen';

function App() {
  const { token, loading } = useAuth();
  const { screen } = useRouter();

  if (loading) {
    return (
      <div className="screen screen-center">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!token) {
    return <LoginScreen />;
  }

  switch (screen) {
    case 'connect-meta':
      return <ConnectMetaScreen />;
    case 'templates':
      return <TemplatesScreen />;
    case 'template-form':
      return <TemplateFormScreen />;
    case 'schedules':
      return <SchedulesScreen />;
    case 'schedule-form':
      return <ScheduleFormScreen />;
    case 'ai':
      return <AiScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <HomeScreen />;
  }
}

export default App;
