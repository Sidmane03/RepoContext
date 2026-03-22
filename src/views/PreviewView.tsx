import { useState } from 'react';
import type { AppState, View } from '../type';

interface Props {
  state: AppState;
  setView: (v: View) => void;
}

export default function PreviewView({ state, setView }: Props) {
  const { fileCount, profile } = state;
  const [recentChanges, setRecentChanges] = useState('');

  // Handle injection of Recent Changes into the existing markdown string
  const getLatestMd = () => {
    let finalMd = state.generatedMd;
    if (recentChanges.trim()) {
       const recentSection = `## Recent Changes\n${recentChanges.trim()}\n\n`;
       // Inject after the Date/Version line (usually the 2nd line)
       const lines = finalMd.split('\n');
       if (lines[0].startsWith('#')) {
         // Find the first blank line after the header (which should be after # Title and Generated: Date)
         let insertIndex = 2;
         while (insertIndex < lines.length && lines[insertIndex].trim() !== '') {
           insertIndex++;
         }
         // Insert after the first blank line or at index 2
         lines.splice(insertIndex + 1, 0, recentSection);
         finalMd = lines.join('\n');
       } else {
         finalMd = recentSection + finalMd;
       }
    }
    return finalMd;
  };

  const downloadMd = () => {
    const finalMd = getLatestMd();
    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(finalMd);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", profile.outputFilename || 'repo_context.md');
    dlAnchorElem.click();
  };

  const exportProfile = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `${profile.projectName || 'profile'}.json`);
    dlAnchorElem.click();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.btnNav} onClick={() => setView('configure')}>
          [ &larr; RETURN_TO_CONFIG ]
        </button>
        <div style={styles.brand}>
            <span style={styles.brandMain}>PREVIEW_MODULE</span>
            <span style={styles.brandSub}>DATA_OUTPUT_VERIFICATION</span>
        </div>
      </div>

      <div style={{ borderBottom: '1px solid #222', marginBottom: '40px' }} />

      <div style={styles.mainLayout}>
        <div style={styles.leftPanel}>
            <div style={styles.sectionHeader}>
                <span style={styles.sectionNum}>05 //</span>
                <h3 style={styles.sectionTitle}>COMMIT_CHANGES</h3>
            </div>
            <textarea 
                style={styles.commitInput}
                value={recentChanges}
                onChange={(e) => setRecentChanges(e.target.value)}
                placeholder="Paste your commit message or describe what changed since last version..."
            />
            
            <div style={styles.summaryBox}>
                <div style={styles.statusInfo}>
                    <span style={styles.statusDot} />
                    <span style={styles.statusText}>
                        READY // <strong>{fileCount}</strong> FILES
                    </span>
                </div>
                <div style={styles.actionsVertical}>
                    <button style={styles.btnPrimary} onClick={downloadMd}>
                        DOWNLOAD_.MD
                    </button>
                    <button style={styles.btnSecondary} onClick={exportProfile}>
                        SAVE_PROFILE.JSON
                    </button>
                </div>
            </div>
        </div>

        <div style={styles.rightPanel}>
            <div style={styles.card}>
                <div style={styles.previewContainer}>
                <textarea 
                    style={styles.textarea} 
                    value={getLatestMd()} 
                    readOnly 
                />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '60px 40px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' as const } as React.CSSProperties,
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  brand: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end' },
  brandMain: { fontSize: '1.5rem', fontWeight: 800, color: '#000000', letterSpacing: '1px' },
  brandSub: { fontSize: '0.65rem', color: '#00f2ff', fontWeight: 700, letterSpacing: '2px', marginTop: '4px' },
  mainLayout: { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '40px', flex: 1, minHeight: 0 },
  leftPanel: { display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  rightPanel: { display: 'flex', flexDirection: 'column' as const, minHeight: 0 },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  sectionNum: { fontSize: '1rem', fontWeight: 700, color: '#00f2ff', opacity: 0.8 },
  sectionTitle: { margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#000000', letterSpacing: '1px' },
  commitInput: { 
    width: '100%', 
    height: '200px', 
    padding: '15px', 
    background: '#000', 
    color: '#00f2ff', 
    border: '1px solid #333', 
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.85rem',
    outline: 'none',
    resize: 'none'
  } as React.CSSProperties,
  summaryBox: { 
    background: '#0f0f0f', 
    padding: '20px', 
    border: '1px solid #222',
    marginTop: 'auto'
  },
  card: { 
    background: '#0f0f0f', 
    border: '1px solid #222', 
    display: 'flex', 
    flexDirection: 'column' as const, 
    flex: 1,
    height: '100%',
    position: 'relative'
  } as React.CSSProperties,
  statusInfo: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#39ff14', boxShadow: '0 0 10px #39ff14', animation: 'pulse 2s infinite' },
  statusText: { fontSize: '0.85rem', color: '#aaa', letterSpacing: '0.5px' },
  actionsVertical: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  previewContainer: { flex: 1, padding: '0', display: 'flex', minHeight: '0' },
  textarea: { 
    width: '100%', 
    height: '100%', 
    padding: '40px', 
    fontFamily: "'JetBrains Mono', monospace", 
    fontSize: '0.9rem', 
    border: 'none', 
    outline: 'none',
    resize: 'none', 
    background: '#000', 
    color: '#888', 
    lineHeight: '1.6' 
  } as React.CSSProperties,
  btnPrimary: { 
    padding: '16px', 
    background: '#00f2ff', 
    color: '#000', 
    border: 'none', 
    fontSize: '0.9rem', 
    cursor: 'pointer', 
    fontWeight: 800,
    transition: 'all 0.2s',
    boxShadow: '0 0 10px rgba(0, 242, 255, 0.3)'
  },
  btnSecondary: { 
    padding: '16px', 
    background: 'transparent', 
    color: '#000000', 
    border: '1px solid #444', 
    fontSize: '0.85rem', 
    cursor: 'pointer', 
    fontWeight: 700,
    transition: 'all 0.2s'
  },
  btnNav: { 
    padding: '10px 20px', 
    background: 'transparent', 
    color: '#888', 
    border: '1px solid #333', 
    fontSize: '0.8rem', 
    cursor: 'pointer', 
    fontWeight: 700,
    letterSpacing: '1px'
  },
};
