import React from 'react';

export function HeroTokenAnimation() {
  return (
    <div className="hero-matrix-loader-wrapper">
      <style>{`
        .hero-matrix-loader-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 420px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: transparent;
          border: none;
          box-shadow: none;
        }

        .hero-matrix-loader {
          perspective: 1400px;
        }

        .hero-matrix-loader .hero-cube {
          width: 180px;
          height: 180px;
          position: relative;
          transform-style: preserve-3d;
          animation: heroCubeSpin 15s infinite linear;
        }

        .hero-matrix-loader .hero-layer {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template: repeat(3, 1fr) / repeat(3, 1fr);
          gap: 6px;
          padding: 3px;
          transform-style: preserve-3d;
          border: 1.5px solid rgba(15, 118, 110, 0.22);
          background: rgba(15, 42, 67, 0.015);
          box-shadow: inset 0 0 16px rgba(15, 118, 110, 0.12);
          border-radius: 10px;
        }

        .hero-matrix-loader .l1 {
          transform: translateZ(-44px);
        }
        .hero-matrix-loader .l2 {
          transform: translateZ(0);
        }
        .hero-matrix-loader .l3 {
          transform: translateZ(44px);
        }

        .hero-matrix-loader .hero-block {
          width: 52px;
          height: 52px;
          border-radius: 6px;
          transform: translateZ(-120px) scale(0.3);
          opacity: 0;
          box-shadow: 0 0 10px rgba(15, 118, 110, 0.2);
          animation: heroRiseIn 3.4s infinite ease-in-out;
        }

        .hero-matrix-loader .l1 .hero-block {
          background: #0F2A43;
          border: 1.5px solid rgba(15, 42, 67, 0.5);
          box-shadow: 0 0 10px rgba(15, 42, 67, 0.3);
        }
        .hero-matrix-loader .l2 .hero-block {
          background: #1F5A7A;
          border: 1.5px solid rgba(31, 90, 122, 0.5);
          box-shadow: 0 0 12px rgba(31, 90, 122, 0.3);
        }
        .hero-matrix-loader .l3 .hero-block {
          background: #0F766E;
          border: 1.5px solid rgba(15, 118, 110, 0.6);
          box-shadow: 0 0 18px rgba(15, 118, 110, 0.45);
        }

        .hero-matrix-loader .hero-layer .hero-block:nth-child(1) { animation-delay: 0s; }
        .hero-matrix-loader .hero-layer .hero-block:nth-child(2) { animation-delay: 0.12s; }
        .hero-matrix-loader .hero-layer .hero-block:nth-child(3) { animation-delay: 0.24s; }
        .hero-matrix-loader .hero-layer .hero-block:nth-child(4) { animation-delay: 0.36s; }
        .hero-matrix-loader .hero-layer .hero-block:nth-child(5) { animation-delay: 0.48s; }
        .hero-matrix-loader .hero-layer .hero-block:nth-child(6) { animation-delay: 0.60s; }
        .hero-matrix-loader .hero-layer .hero-block:nth-child(7) { animation-delay: 0.72s; }
        .hero-matrix-loader .hero-layer .hero-block:nth-child(8) { animation-delay: 0.84s; }
        .hero-matrix-loader .hero-layer .hero-block:nth-child(9) { animation-delay: 0.96s; }

        @keyframes heroRiseIn {
          0% {
            transform: translateZ(-120px) scale(0.3);
            opacity: 0;
          }
          50% {
            transform: translateZ(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateZ(36px) scale(0.5);
            opacity: 0.35;
          }
        }

        @keyframes heroCubeSpin {
          0% {
            transform: rotateX(15deg) rotateY(0deg);
          }
          100% {
            transform: rotateX(375deg) rotateY(360deg);
          }
        }
      `}</style>
      <div className="hero-matrix-loader">
        <div className="hero-cube">
          <div className="hero-layer l1">
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
          </div>
          <div className="hero-layer l2">
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
          </div>
          <div className="hero-layer l3">
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
            <div className="hero-block" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroTokenAnimation;
