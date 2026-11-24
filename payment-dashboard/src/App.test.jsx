import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import App from './App';

const STORAGE_KEY = 'stellar_dashboard_wallet_pubkey';
const TEST_PUBLIC_KEY = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV';

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  getPublicKey: vi.fn(),
  requestAccess: vi.fn(),
}));

import * as freighterApi from '@stellar/freighter-api';

describe('App wallet persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('persists the connected public key to localStorage after a successful connection', async () => {
    freighterApi.isConnected.mockResolvedValue({ isConnected: true });
    freighterApi.requestAccess.mockResolvedValue({ publicKey: TEST_PUBLIC_KEY });
    freighterApi.getPublicKey.mockResolvedValue({ publicKey: TEST_PUBLIC_KEY });

    render(<App />);

    const connectButton = await screen.findByRole('button', { name: /connect/i });
    connectButton.click();

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toBe(TEST_PUBLIC_KEY);
    });
  });

  it('restores a previously connected wallet on load via silent reconnection', async () => {
    localStorage.setItem(STORAGE_KEY, TEST_PUBLIC_KEY);
    freighterApi.isConnected.mockResolvedValue({ isConnected: true });
    freighterApi.getPublicKey.mockResolvedValue({ publicKey: TEST_PUBLIC_KEY });

    render(<App />);

    await waitFor(() => {
      expect(freighterApi.getPublicKey).toHaveBeenCalled();
    });

    expect(await screen.findByText(new RegExp(TEST_PUBLIC_KEY.slice(0, 6)))).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(TEST_PUBLIC_KEY);
  });

  it('clears storage and shows the connect prompt when silent reconnection fails', async () => {
    localStorage.setItem(STORAGE_KEY, TEST_PUBLIC_KEY);
    freighterApi.isConnected.mockResolvedValue({ isConnected: false });
    freighterApi.getPublicKey.mockRejectedValue(new Error('Wallet locked'));

    render(<App />);

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    expect(await screen.findByRole('button', { name: /connect/i })).toBeTruthy();
  });
});

describe('App network badge', () => {
  const originalNetwork = import.meta.env.VITE_NETWORK;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    freighterApi.isConnected.mockResolvedValue({ isConnected: false });
    freighterApi.getPublicKey.mockRejectedValue(new Error('Wallet locked'));
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    import.meta.env.VITE_NETWORK = originalNetwork;
  });

  it('renders a green badge for mainnet', async () => {
    import.meta.env.VITE_NETWORK = 'mainnet';

    render(<App />);

    const badge = await screen.findByTestId('network-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toMatch(/mainnet/i);
    expect(badge.className).toMatch(/green/);
  });

  it('renders a yellow badge for testnet', async () => {
    import.meta.env.VITE_NETWORK = 'testnet';

    render(<App />);

    const badge = await screen.findByTestId('network-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toMatch(/testnet/i);
    expect(badge.className).toMatch(/yellow|amber/);
  });

  it('defaults to a testnet badge when VITE_NETWORK is unset', async () => {
    delete import.meta.env.VITE_NETWORK;

    render(<App />);

    const badge = await screen.findByTestId('network-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toMatch(/testnet/i);
    expect(badge.className).toMatch(/yellow|amber/);
  });
});
