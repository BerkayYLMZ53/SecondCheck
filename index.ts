import { registerRootComponent } from 'expo';
import StartupRoot from './components/StartupRoot';
import { beginStartup } from './utils/startup';

beginStartup();
registerRootComponent(StartupRoot);
