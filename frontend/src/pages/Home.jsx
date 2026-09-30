import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const Home = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [hash]);

  return (
    <>
      {/* Hero Section */}
      <section className="hero-section" id="hero">
        <div className="container">
          <span className="hero-super-line">FOUNDED ON HUMAN DISCIPLINE</span>

          <h1 className="hero-title">
            MADE WITH LOVE <span className="green-heart">💚</span><br />
            PASSION NOT AUTOMATION
          </h1>

          <p className="hero-editorial-lead">
            We make games because we love the craft. In an era saturated with cold generation and generic algorithms, <strong>FCorpse</strong> is dedicated to the human hand, where architectural order, wild botanical nature, and deliberate engineering meet.
          </p>

          <div className="manifesto-inscription">
            <p className="inscription-quote">
              "AI-slop has made things look too ugly. We believe games should be created with patience, touch, and authentic artistic soul."
            </p>
            <div className="inscription-author">
              <span>— STUDIO MANIFESTO</span>
            </div>
          </div>
        </div>
      </section>

      {/* Identity Section */}
      <section className="who-we-are-section" id="who-we-are">
        <div className="container">
          <span className="section-datum">01 — IDENTITY</span>
          
          <div className="who-layout">
            <div>
              <h2 className="who-headline-statement">
                A GROUP OF ENGINEERS AND ARTISTS WHO WANT TO MAKE GOOD ART AND FUN GAMES.
              </h2>
            </div>
            
            <div className="who-narrative">
              <p>
                We haven't released any games yet, and we don't pretend otherwise. We are currently in the studio, starting from first principles, designing worlds with pencil sketches, handwritten code, and genuine dedication.
              </p>
              <p>
                Instead of rushing disposable titles or relying on shortcuts, we are taking our time to learn, iterate, and build something enduring. Good art takes intention; fun games take human playtesting and care.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="philosophy-section" id="philosophy">
        <div className="container">
          <span className="section-datum">02 — PHILOSOPHY</span>
          
          <div className="philosophy-container">
            <div className="philosophy-heading-col">
              <h2>OUR PHILOSOPHY</h2>
              <p>The core values guiding every sketch and line of code.</p>
            </div>

            <div className="philosophy-text-block">
              <p className="philosophy-prologue">
                Games are architectural spaces where players live, explore, and feel something real.
              </p>

              <p className="philosophy-body">
                When you automate the creative process, you strip away the happy accidents and emotional resonance that make games memorable. We draw inspiration from living landscapes, classical structures, and visceral game-feel. We want our worlds to carry physical weight, botanical life, and human warmth.
              </p>

              <div className="philosophy-pillars">
                <div className="pillar-box">
                  <h3 className="pillar-name">Nature and Structure</h3>
                  <p>
                    Designing spaces with the precision of an architect and the quiet vitality of wild botanical growth. Built to be explored, not just observed.
                  </p>
                </div>
                
                <div className="pillar-box">
                  <h3 className="pillar-name">Hand-Tuned Play</h3>
                  <p>
                    Mechanics tuned by human hands and reflexes. Finding the fun through honest playtesting, not engagement metrics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workshop Section */}
      <section className="workshop-section" id="workshop">
        <div className="container">
          <span className="section-datum">03 — IN THE WORKSHOP</span>

          <div className="architectural-study-card">
            <div className="study-top-meta">
              <div>
                <h3>STUDIO STUDY 01 — ARCHITECTURE AND NATURE</h3>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.95rem', marginTop: '4px' }}>Early thematic exploration for our debut game world.</p>
              </div>
              <span className="study-status-badge">Stay tuned for our next project 🌿</span>
            </div>

            <div className="study-visual-frame">
              <img src="/assets/images/botanical_architecture.svg" alt="Architectural and Botanical Study for Debut Game" />
            </div>

            <div className="study-meta-grid">
              <div>
                <p>
                  This architectural study embodies what we are building: monolithic structures overgrown with living botanicals. A handcrafted composition exploring the balance between human order and natural growth.
                </p>
              </div>
              
              <div className="study-status-capsule">
                <strong>DEBUT PROJECT</strong>
                <p style={{ fontSize: '0.92rem', color: 'var(--ink-secondary)', margin: '0' }}>
                  Currently in active pre-production.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
