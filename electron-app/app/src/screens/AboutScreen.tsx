/**
 * About Screen - Desktop version
 */

import React from 'react';
import {useNavigate} from 'react-router-dom';
import {Button} from '../components/ui';
import './AboutScreen.css';

const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '1';

// Logo: webpack inlines app_logo.png as base64 (see webpack.config.js appLogoInlineRule)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOGO_IMAGE = require('../app_logo.png') as string;

const LINKS = {
  privacy: 'https://xenolexia.app/privacy',
  terms: 'https://xenolexia.app/terms',
  support: 'mailto:support@xenolexia.app',
  github: 'https://github.com/hsnamr/xenolexia-electron',
};

const ACKNOWLEDGMENTS = [
  {name: 'React Native', url: 'https://reactnative.dev'},
  {name: 'Zustand', url: 'https://zustand-demo.pmnd.rs'},
  {name: 'React Navigation', url: 'https://reactnavigation.org'},
  {name: 'LibreTranslate', url: 'https://libretranslate.com'},
  {name: 'FrequencyWords', url: 'https://github.com/hermitdave/FrequencyWords'},
  {name: 'Electron', url: 'https://www.electronjs.org'},
  {name: 'epubjs', url: 'https://github.com/futurepress/epub.js'},
];

export function AboutScreen(): React.JSX.Element {
  const navigate = useNavigate();

  const handleOpenLink = (url: string) => {
    if (window.electronAPI) {
      // Use Electron shell to open external links
      window.electronAPI.openExternal?.(url).catch(() => {
        window.open(url, '_blank');
      });
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="about-screen">
      <div className="about-header">
        <button onClick={() => navigate(-1)} className="about-back-button">
          ← Back
        </button>
        <h1>About Xenolexia</h1>
        <div style={{width: '80px'}} />
      </div>

      <div className="about-content">
        {/* App Info */}
        <div className="about-app-info">
          <img src={LOGO_IMAGE} alt="Xenolexia" className="about-app-icon about-app-logo" />
          <h2 className="about-app-name">Xenolexia</h2>
          <p className="about-app-version">Version {APP_VERSION} ({BUILD_NUMBER})</p>
          <p className="about-app-tagline">Learn languages through reading</p>
        </div>

        {/* Description */}
        <div className="about-description-card">
          <p className="about-description-text">
            Xenolexia helps you learn foreign languages naturally by replacing words in the books you read. 
            As you encounter words in context, you build vocabulary without traditional flashcard memorization.
          </p>
        </div>

        {/* Links Section */}
        <div className="about-section">
          <h3 className="about-section-title">LINKS</h3>
          <div className="about-section-card">
            <button className="about-link-row" onClick={() => handleOpenLink(LINKS.privacy)}>
              <span className="about-link-icon">🔒</span>
              <span className="about-link-label">Privacy Policy</span>
              <span className="about-link-chevron">›</span>
            </button>
            <div className="about-divider" />
            <button className="about-link-row" onClick={() => handleOpenLink(LINKS.terms)}>
              <span className="about-link-icon">📜</span>
              <span className="about-link-label">Terms of Service</span>
              <span className="about-link-chevron">›</span>
            </button>
            <div className="about-divider" />
            <button className="about-link-row" onClick={() => handleOpenLink(LINKS.support)}>
              <span className="about-link-icon">💬</span>
              <span className="about-link-label">Contact Support</span>
              <span className="about-link-chevron">›</span>
            </button>
            <div className="about-divider" />
            <button className="about-link-row" onClick={() => handleOpenLink(LINKS.github)}>
              <span className="about-link-icon">💻</span>
              <span className="about-link-label">Source Code</span>
              <span className="about-link-chevron">›</span>
            </button>
          </div>
        </div>

        {/* Acknowledgments */}
        <div className="about-section">
          <h3 className="about-section-title">ACKNOWLEDGMENTS</h3>
          <div className="about-section-card">
            <div className="about-acknowledge-content">
              <p className="about-acknowledge-intro">Built with these amazing open source projects:</p>
              {ACKNOWLEDGMENTS.map((item) => (
                <button
                  key={item.name}
                  className="about-acknowledge-item"
                  onClick={() => handleOpenLink(item.url)}
                >
                  • {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Credits */}
        <div className="about-section">
          <h3 className="about-section-title">CREDITS</h3>
          <div className="about-section-card">
            <div className="about-credits-content">
              <p className="about-credits-text">
                Designed and developed with 📚 for language learners everywhere.
              </p>
              <p className="about-credits-text">
                Special thanks to the open source community and all our early testers.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="about-footer">
          <p className="about-footer-text">© 2024 Xenolexia</p>
          <p className="about-footer-text">Made with ❤️</p>
        </div>
      </div>
    </div>
  );
}
