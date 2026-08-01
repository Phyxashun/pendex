import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DocsApp from '../src/docs/DocsApp';
import '../src/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element not found');

createRoot(rootEl).render(
    <StrictMode>
        <DocsApp />
    </StrictMode>,
);
