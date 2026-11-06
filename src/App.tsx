import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { defaultPortfolio } from './data';
import { loadPortfolio } from './lib/portfolio';
import { supabase } from './lib/supabase';
import type { PortfolioData } from './types';
import Home from './pages/Home';
import Admin from './pages/Admin';

export default function App() {
  const [portfolio, setPortfolio] = useState<PortfolioData>(defaultPortfolio);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let alive = true;
    loadPortfolio()
      .then((data) => { if (alive) setPortfolio(data); })
      .catch((error: unknown) => { if (alive) setLoadError(error instanceof Error ? error.message : 'Could not load portfolio data.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);


useEffect(() => {
  const client = supabase;

  if (!client) return;

  let alive = true;

  const channel = client
    .channel('portfolio-live-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'portfolio_content',
      },
      () => {
        loadPortfolio()
          .then((data) => {
            if (!alive) return;

            setPortfolio(data);
            setLoadError('');
          })
          .catch(() => {
            if (!alive) return;

            setLoadError(
              'Live portfolio refresh failed. Reload the page to try again.'
            );
          });
      }
    )
    .subscribe();

  return () => {
    alive = false;
    void client.removeChannel(channel);
  };
}, []);


  // Cleanup subscription when component unmounts
  return () => {
    void client.removeChannel(channel);
  };
}, []);


  const refresh = async () => setPortfolio(await loadPortfolio());

  return (
    <>
      {loadError && <div className="global-alert">Portfolio data could not be loaded: {loadError}</div>}
      <Routes>
        <Route path="/" element={<Home data={portfolio} loading={loading} />} />
        <Route path="/admin/*" element={<Admin data={portfolio} onSaved={refresh} loading={loading} />} />
        <Route path="*" element={<Home data={portfolio} loading={loading} />} />
      </Routes>
    </>
  );
}
