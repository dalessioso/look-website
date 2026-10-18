import { mountAnimations } from './animation.js';
import './showcase.css';
import { initializeNavigation } from './navigation.js';
import { initializeStreams } from './presentation.js';
import { initializeStudio } from './studio.js';

initializeNavigation();
initializeStreams();
initializeStudio();
mountAnimations();
