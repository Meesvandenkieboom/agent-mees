/**
 * Agent Smith - Modern chat interface for Claude Agent SDK
 * Copyright (C) 2025 KenKai
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { toast } from '../../utils/toast';

type SetupStep = 'instructions' | 'form' | 'credentials';

interface GitHubOAuthSetupModalProps {
  onComplete: () => void;
  onClose: () => void;
}

export function GitHubOAuthSetupModal({ onComplete, onClose }: GitHubOAuthSetupModalProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('instructions');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to top whenever step changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  // Smooth transition helper
  const transitionToStep = (nextStep: SetupStep) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(nextStep);
      setIsTransitioning(false);
    }, 150);
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`Copied ${label}!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Validate Client ID format
  const validateClientId = (id: string): boolean => {
    return /^[A-Za-z0-9]{20,}$/.test(id);
  };

  // Validate Client Secret format
  const validateClientSecret = (secret: string): boolean => {
    return /^[a-f0-9]{40}$/.test(secret);
  };

  // Submit credentials to backend
  const handleSubmit = async () => {
    // Validation
    if (!clientId || !clientSecret) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!validateClientId(clientId)) {
      toast.error('Invalid Client ID format', {
        description: 'Expected: alphanumeric, 20+ characters'
      });
      return;
    }

    if (!validateClientSecret(clientSecret)) {
      toast.error('Invalid Client Secret format', {
        description: 'Expected: 40 hexadecimal characters'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/github/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });

      const data = await response.json() as { success: boolean; error?: string; message?: string };

      if (data.success) {
        toast.success('GitHub OAuth configured successfully!');
        onComplete();
      } else {
        toast.error('Configuration failed', {
          description: data.error || 'Please check your credentials'
        });
      }
    } catch (error) {
      console.error('Failed to configure OAuth:', error);
      toast.error('Failed to save credentials', {
        description: 'Please try again'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progress indicator
  const steps: SetupStep[] = ['instructions', 'form', 'credentials'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgb(20, 22, 24)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgb(24, 26, 28)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'rgb(255, 255, 255)' }}>
            Set up GitHub Integration
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgb(255, 255, 255)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: 'rgb(99, 102, 241)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            opacity: isTransitioning ? 0.5 : 1,
            transition: 'opacity 0.15s ease',
          }}
        >
          {currentStep === 'instructions' && (
            <div>
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: 'rgb(255, 255, 255)' }}>
                Welcome to GitHub Integration Setup
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '20px', lineHeight: 1.6 }}>
                Connect your GitHub account to enable powerful features:
              </p>
              <ul style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '24px', lineHeight: 1.8 }}>
                <li>Clone any repository to work on</li>
                <li>Push commits directly from Agent Smith</li>
                <li>Automatic git credential configuration</li>
              </ul>

              <div
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                }}
              >
                <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', lineHeight: 1.6 }}>
                  <strong>First, create a GitHub OAuth App:</strong>
                </p>
                <button
                  onClick={() => window.open('https://github.com/settings/developers', '_blank')}
                  style={{
                    marginTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    borderRadius: '6px',
                    color: 'rgb(167, 169, 255)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.3)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                  }}
                >
                  <span>Open GitHub Developer Settings</span>
                  <ExternalLink size={16} />
                </button>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px', fontWeight: 500 }}>
                  Instructions:
                </p>
                <ol style={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.8, paddingLeft: '20px' }}>
                  <li>Click "New OAuth App" on the GitHub settings page</li>
                  <li>Fill in the application details (we'll provide the values)</li>
                  <li>Copy your Client ID and Secret</li>
                </ol>
              </div>
            </div>
          )}

          {currentStep === 'form' && (
            <div>
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: 'rgb(255, 255, 255)' }}>
                Create GitHub OAuth App
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '20px', lineHeight: 1.6 }}>
                Use these values when creating your OAuth app on GitHub:
              </p>

              {/* Application Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                  Application name
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value="Agent Smith"
                    readOnly
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: 'rgb(255, 255, 255)',
                      fontSize: '14px',
                      cursor: 'default',
                    }}
                  />
                  <button
                    onClick={() => handleCopy('Agent Smith', 'Application name')}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      borderRadius: '6px',
                      color: 'rgb(167, 169, 255)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
                    }}
                  >
                    {copiedField === 'Application name' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Homepage URL */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                  Homepage URL
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value="http://localhost:3001"
                    readOnly
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: 'rgb(255, 255, 255)',
                      fontSize: '14px',
                      cursor: 'default',
                    }}
                  />
                  <button
                    onClick={() => handleCopy('http://localhost:3001', 'Homepage URL')}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      borderRadius: '6px',
                      color: 'rgb(167, 169, 255)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
                    }}
                  >
                    {copiedField === 'Homepage URL' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Callback URL */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                  Authorization callback URL
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value="http://localhost:3001/api/github/callback"
                    readOnly
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: 'rgb(255, 255, 255)',
                      fontSize: '14px',
                      cursor: 'default',
                    }}
                  />
                  <button
                    onClick={() => handleCopy('http://localhost:3001/api/github/callback', 'Callback URL')}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      borderRadius: '6px',
                      color: 'rgb(167, 169, 255)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
                    }}
                  >
                    {copiedField === 'Callback URL' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                }}
              >
                <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px', lineHeight: 1.5 }}>
                  <strong>Note:</strong> After clicking "Register application", you'll see your Client ID.
                  Click "Generate a new client secret" to get your secret. <strong>Save it securely - you can only view it once!</strong>
                </p>
              </div>
            </div>
          )}

          {currentStep === 'credentials' && (
            <div>
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: 'rgb(255, 255, 255)' }}>
                Enter Your Credentials
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '20px', lineHeight: 1.6 }}>
                Paste the Client ID and Secret from your GitHub OAuth app:
              </p>

              {/* Client ID */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                  Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Iv1.1234567890abcdef"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${clientId && !validateClientId(clientId) ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                    borderRadius: '6px',
                    color: 'rgb(255, 255, 255)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                {clientId && !validateClientId(clientId) && (
                  <p style={{ margin: '4px 0 0 0', color: 'rgb(239, 68, 68)', fontSize: '12px' }}>
                    Invalid format (alphanumeric, 20+ chars)
                  </p>
                )}
              </div>

              {/* Client Secret */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                  Client Secret
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="1234567890abcdef..."
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${clientSecret && !validateClientSecret(clientSecret) ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                      borderRadius: '6px',
                      color: 'rgb(255, 255, 255)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.6)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgb(255, 255, 255)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)')}
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {clientSecret && !validateClientSecret(clientSecret) && (
                  <p style={{ margin: '4px 0 0 0', color: 'rgb(239, 68, 68)', fontSize: '12px' }}>
                    Invalid format (40 hexadecimal characters)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            backgroundColor: 'rgb(24, 26, 28)',
          }}
        >
          <button
            onClick={() => {
              if (currentStep === 'instructions') {
                onClose();
              } else if (currentStep === 'form') {
                transitionToStep('instructions');
              } else {
                transitionToStep('form');
              }
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: 'rgb(255, 255, 255)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {currentStep === 'instructions' ? 'Cancel' : 'Back'}
          </button>

          <button
            onClick={() => {
              if (currentStep === 'instructions') {
                transitionToStep('form');
              } else if (currentStep === 'form') {
                transitionToStep('credentials');
              } else {
                handleSubmit();
              }
            }}
            disabled={currentStep === 'credentials' && (!clientId || !clientSecret || !validateClientId(clientId) || !validateClientSecret(clientSecret)) || isSubmitting}
            style={{
              padding: '10px 20px',
              backgroundColor: currentStep === 'credentials' && (!clientId || !clientSecret || !validateClientId(clientId) || !validateClientSecret(clientSecret))
                ? 'rgba(99, 102, 241, 0.3)'
                : 'rgb(99, 102, 241)',
              border: 'none',
              borderRadius: '6px',
              color: 'rgb(255, 255, 255)',
              cursor: currentStep === 'credentials' && (!clientId || !clientSecret || !validateClientId(clientId) || !validateClientSecret(clientSecret)) || isSubmitting
                ? 'not-allowed'
                : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              opacity: isSubmitting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!(currentStep === 'credentials' && (!clientId || !clientSecret || !validateClientId(clientId) || !validateClientSecret(clientSecret))) && !isSubmitting) {
                e.currentTarget.style.backgroundColor = 'rgb(79, 82, 221)';
              }
            }}
            onMouseLeave={(e) => {
              if (!(currentStep === 'credentials' && (!clientId || !clientSecret || !validateClientId(clientId) || !validateClientSecret(clientSecret))) && !isSubmitting) {
                e.currentTarget.style.backgroundColor = 'rgb(99, 102, 241)';
              }
            }}
          >
            {isSubmitting ? 'Saving...' : currentStep === 'credentials' ? 'Save & Connect' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
