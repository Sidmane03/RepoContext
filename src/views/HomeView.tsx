import type { AppState, Profile, View } from '../type';

interface Props {
  state: AppState;
  setView: (v: View) => void;
  setProfile: (p: Profile) => void;
}

export default function HomeView({ setView, setProfile }: Props) {
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string) as Profile;
            setProfile(data);
            setView('configure');
          } catch (err) {
            alert('CRITICAL ERROR: Invalid profile JSON file.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
            <div style={styles.separator} />
        </div>
        
        <h1 style={styles.title}>
            REPOCONTEXT<span style={styles.cursor}>_</span>
        </h1>   
        <div style={styles.buttonContainer}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>New Project</h3>
            <button 
                style={styles.btnPrimary} 
                onClick={() => setView('configure')}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 242, 255, 0.6)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              Initialize →
            </button>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Import Profile</h3>
            <button 
                style={styles.btnSecondary} 
                onClick={handleImport}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#555')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#333')}
            >
              Load JSON //
            </button>
          </div>
        </div>

        <div style={styles.footer}>
            <span style={styles.footerItem}>[ STATUS: OPERATIONAL ]</span>
            <span style={styles.footerItem}>[ ENCRYPTION: AES-256 ]</span>
            <span style={styles.footerItem}>[ MODULE: CLIENT_SIDE_ONLY ]</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    minHeight: '100vh', 
    padding: '40px',
    position: 'relative',
    zIndex: 1
  } as React.CSSProperties,
  content: {
    maxWidth: '1000px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,
  header: { marginBottom: '20px' },
  breadcrumb: { color: '#00f2ff', fontSize: '0.8rem', letterSpacing: '2px', fontWeight: 700 },
  separator: { height: '1px', background: 'rgba(255,255,255,0.1)', width: '100%', marginTop: '10px' },
  title: { 
    fontSize: '5rem', 
    margin: '20px 0', 
    fontWeight: 800, 
    letterSpacing: '-2px', 
    color: '#000000',
    textShadow: '0 0 10px rgba(255,255,255,0.2)'
  } as React.CSSProperties,
  cursor: { color: '#00f2ff', animation: 'blink 1.5s infinite steps(1)' },
  tagline: { 
    fontSize: '1rem', 
    color: '#888', 
    margin: '0 0 60px 0', 
    letterSpacing: '0.5px',
    fontStyle: 'italic'
  } as React.CSSProperties,
  buttonContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
    marginBottom: '80px'
  } as React.CSSProperties,
  card: {
    background: '#0f0f0f',
    border: '1px solid #222',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transition: 'border-color 0.3s'
  } as React.CSSProperties,
  cardNum: { color: '#555', fontSize: '0.75rem', marginBottom: '10px', display: 'block' },
  cardTitle: { fontSize: '1.5rem', margin: '0 0 30px 0', color: '#fff', fontWeight: 600 },
  btnPrimary: {
    padding: '16px 24px',
    background: '#00f2ff',
    color: '#000',
    border: 'none',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s',
    outline: 'none'
  } as React.CSSProperties,
  btnSecondary: {
    padding: '16px 24px',
    background: 'transparent',
    color: '#fff',
    border: '1px solid #333',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s',
    outline: 'none'
  } as React.CSSProperties,
  footer: {
    display: 'flex',
    gap: '30px',
    marginTop: 'auto',
    opacity: 0.4,
    fontSize: '0.7rem',
    letterSpacing: '1px',
    fontWeight: 600
  } as React.CSSProperties,
  footerItem: { display: 'block' }
};
