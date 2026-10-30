import React from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/fonts.css';
import '../styles/kei.css';
import '../styles/kei-wear.css';
import './tune.css';
import { Tune } from './Tune';
// Worn faces from `npm run wear:font`, to compare with the plain ones; absent until it has run.
import.meta.glob('../../wear-fonts/fonts.css', { eager: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Tune />
  </React.StrictMode>,
);
