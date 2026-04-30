import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/mindmap.css';
import './styles/latex-overleaf-style.css';
import 'katex/dist/katex.min.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
