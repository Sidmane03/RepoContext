


import { useState, useEffect, useMemo, useRef } from 'react';
import type { AppState, Profile, View } from '../type';
import { fetchGithubTree, fetchGithubFiles } from '../utils/githubFetcher';
import { readZipFiles } from '../utils/zipReader';
import { filterFiles } from '../utils/filter';
import { buildFileTree } from '../utils/treeBuilder';
import { generateMarkdown } from '../utils/mdGenerator';
import JSZip from 'jszip';


interface Props {
  state: AppState;
  setProfile: (p: Profile | ((prev: Profile) => Profile)) => void;
  setView: (v: View) => void;
  setLoading: (l: boolean, m?: string) => void;
  setError: (e: string | null) => void;
  setGeneratedData: (md: string, count: number) => void;
}

interface TreeNodeInfo {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNodeInfo[];
}

function buildTreeNodes(paths: string[]): TreeNodeInfo[] {
  const root: TreeNodeInfo = { name: 'root', path: '', isFolder: true, children: [] };
  
  paths.sort().forEach(fullPath => {
    const parts = fullPath.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');
        
        let child = current.children.find(c => c.name === part);
        if (!child) {
        child = { name: part, path: currentPath, isFolder: !isFile, children: [] };
        current.children.push(child);
        }
        current = child;
    }
  });

  return root.children;
}

function getAllFiles(node: TreeNodeInfo): string[] {
  if (!node.isFolder) return [node.path];
  return node.children.flatMap(getAllFiles);
}

const CheckboxNode = ({ 
  node, depth, checkedPaths, onChange 
}: { 
  node: TreeNodeInfo; depth: number; checkedPaths: Set<string>; onChange: (paths: string[], checked: boolean) => void;
}) => {
  const [expanded, setExpanded] = useState(depth < 1);
  const allNodeFiles = useMemo(() => getAllFiles(node), [node]);
  const selectedCount = allNodeFiles.filter(f => checkedPaths.has(f)).length;
  const totalCount = allNodeFiles.length;
  const isChecked = totalCount > 0 && selectedCount === totalCount;
  const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(allNodeFiles, e.target.checked);
  };

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 20 }}>
      <div 
        style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '6px 12px', 
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            background: depth % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
            cursor: 'pointer'
        }} 
        onClick={() => node.isFolder && setExpanded(!expanded)}
      >
        {node.isFolder ? (
          <span style={{ display: 'inline-block', width: 24, textAlign: 'center', color: expanded ? '#00f2ff' : '#555', fontSize: '0.7rem' }}>
            {expanded ? '[-]' : '[+]'}
          </span>
        ) : <span style={{ display: 'inline-block', width: 24, textAlign: 'center', color: '#333' }}>[ ]</span>}
        
        <input 
          type="checkbox" 
          checked={isChecked}
          ref={el => { if (el) el.indeterminate = isIndeterminate; }}
          onChange={handleToggle}
          onClick={e => e.stopPropagation()}
          style={{ marginRight: 12, accentColor: '#00f2ff', cursor: 'pointer' }}
        />
        <span style={{ 
            fontSize: '0.9rem', 
            color: node.isFolder ? '#e0e0e0' : '#aaa', 
            fontWeight: node.isFolder ? 700 : 400,
            flex: 1
        }}>
          {node.name}{node.isFolder ? '/' : ''}
        </span>
        {node.isFolder && <span style={{ marginLeft: 10, fontSize: '0.75rem', color: '#555', opacity: 0.6 }}>{selectedCount}/{totalCount}</span>}
      </div>
      
      {node.isFolder && expanded && (
        <div style={{ borderLeft: '1px solid #1a1a1a', marginLeft: 11 }}>
          {node.children.map(child => (
            <CheckboxNode key={child.path} node={child} depth={depth + 1} checkedPaths={checkedPaths} onChange={onChange}/>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ConfigureView({ state, setProfile, setView, setLoading, setError, setGeneratedData }: Props) {
  const [excludeInput, setExcludeInput] = useState('');
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [treePaths, setTreePaths] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { profile, isLoading, loadingMessage, error } = state;

  const treeNodes = useMemo(() => buildTreeNodes(treePaths), [treePaths]);
  const checkedSet = useMemo(() => new Set(profile.includePatterns), [profile.includePatterns]);

  useEffect(() => {
    setProfile(prev => {
      const sanitized = prev.projectName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      const newFilename = prev.projectName ? `${sanitized}_context.md` : '';
      if (prev.outputFilename === newFilename) return prev;
      return { ...prev, outputFilename: newFilename };
    });
  }, [profile.projectName, setProfile]);

  const handleFieldChange = <K extends keyof Profile>(field: K, value: Profile[K]) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleTreeChange = (paths: string[], checked: boolean) => {
    const newSet = new Set(checkedSet);
    paths.forEach(p => checked ? newSet.add(p) : newSet.delete(p));
    setProfile(prev => ({ ...prev, includePatterns: Array.from(newSet) }));
  };

  const addExcludePattern = () => {
    if (!excludeInput.trim()) return;
    if (!profile.excludePatterns.includes(excludeInput)) {
      handleFieldChange('excludePatterns', [...profile.excludePatterns, excludeInput]);
    }
    setExcludeInput('');
  };

  const removeExcludePattern = (index: number) => {
    const newPatterns = [...profile.excludePatterns];
    newPatterns.splice(index, 1);
    handleFieldChange('excludePatterns', newPatterns);
  };

  const loadStructure = async () => {
    setError(null);
    try {
      if (profile.sourceType === 'github') {
        if (!profile.repoUrl) { setError("ERROR: URL_REQUIRED"); return; }
        setLoading(true, "RUN // FETCH_TREE");
        const paths = await fetchGithubTree(profile.repoUrl);
        setTreePaths(paths);
        handleFieldChange('includePatterns', paths);
      } else {
        if (!localFile) { setError("ERROR: FILE_REQUIRED"); return; }
        setLoading(true, "RUN // ZIP_SCAN");
        const zip = await JSZip.loadAsync(localFile);
        const paths: string[] = [];
        zip.forEach((relativePath, entry) => { if (!entry.dir) paths.push(relativePath); });
        setTreePaths(paths);
        handleFieldChange('includePatterns', paths);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setError(null);
    if (!profile.projectName) { setError("ERROR: NAME_REQUIRED"); return; }
    
    try {
      setLoading(true, "INITIALIZING...");
      let finalFiles = [];
      let finalTreePaths: string[] = [];

      if (profile.sourceType === 'github') {
        setLoading(true, "RUN // PATH_FILTER");
        const userSelectedPaths = treePaths.length > 0 ? profile.includePatterns : await fetchGithubTree(profile.repoUrl);
        const filteredPaths = filterFiles(userSelectedPaths, [], profile.excludePatterns);
        if (filteredPaths.length === 0) throw new Error("ERROR: NO_MATCHES");
        
        finalTreePaths = filteredPaths;
        finalFiles = await fetchGithubFiles(
          profile.repoUrl, 
          filteredPaths, 
          (msg) => setLoading(true, msg)
        );
      } else {
        setLoading(true, "RUN // DATA_STREAM");
        const allFiles = await readZipFiles(localFile!);
        const userSelectedPaths = treePaths.length > 0 ? profile.includePatterns : allFiles.map(f => f.path);
        const filteredPaths = filterFiles(userSelectedPaths, [], profile.excludePatterns);
        if (filteredPaths.length === 0) throw new Error("ERROR: NO_MATCHES");
        
        finalTreePaths = filteredPaths;
        finalFiles = allFiles.filter(f => filteredPaths.includes(f.path));
      }

      setLoading(true, "GEN // MARKDOWN");
      const treeString = buildFileTree(finalTreePaths);
      const mdContent = generateMarkdown(profile.projectName, treeString, finalFiles);
      
      setGeneratedData(mdContent, finalFiles.length);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  };

  const handleDownloadStructure = () => {
    setError(null);
    if (!profile.projectName) { setError("ERROR: NAME_REQUIRED"); return; }
    if (profile.includePatterns.length === 0) { setError("ERROR: NO_FILES_SELECTED"); return; }
    
    try {
      const treeString = buildFileTree(profile.includePatterns);
      const mdContent = generateMarkdown(profile.projectName, treeString, [], profile.version);
      
      const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(mdContent);
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute("href", dataStr);
      const structureFilename = profile.outputFilename.replace('-context.md', '-structure.md').replace('_context.md', '_structure.md');
      dlAnchorElem.setAttribute("download", structureFilename || `${profile.projectName.toLowerCase()}_structure.md`);
      dlAnchorElem.click();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const isStep2Complete = profile.sourceType === 'github' ? !!profile.repoUrl : !!localFile;
  const isStep3Complete = treePaths.length > 0;

  return (
    <div style={styles.container}>
      {isLoading && <div className="scan-overlay" />}
      <div style={styles.header}>
        <div style={styles.brand}>
            <span style={styles.brandMain}>REPOCONTEXT</span>
            <span style={styles.brandSub}>SYSTEM_DASHBOARD</span>
        </div>
        <button style={styles.btnNav} onClick={() => setView('home')}>[ TERMINATE ]</button>
      </div>

      <div style={{ borderBottom: '1px solid #222', marginBottom: '40px' }} />

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* SECTION 1 */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionNum}>01 //</span>
          <h3 style={styles.sectionTitle}>PROJECT_IDENTITY</h3>
        </div>
        <div style={styles.sectionContent}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <input 
              style={{ ...styles.input, flex: 3 }} 
              value={profile.projectName} 
              onChange={e => handleFieldChange('projectName', e.target.value)} 
              placeholder="ENTER_PROJECT_NAME..."
            />
            <input 
              style={{ ...styles.input, flex: 1 }} 
              value={profile.version} 
              onChange={e => handleFieldChange('version', e.target.value)} 
              placeholder="VER (e.g. v1)"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2 */}
      {profile.projectName && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionNum}>02 //</span>
            <h3 style={styles.sectionTitle}>DATA_SOURCE_ORIGIN</h3>
          </div>
          <div style={styles.sectionContent}>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input type="radio" checked={profile.sourceType === 'github'} onChange={() => {handleFieldChange('sourceType', 'github'); setTreePaths([]);}} style={styles.radioInput}/>
                <span>GITHUB_REMOTE</span>
              </label>
              <label style={styles.radioLabel}>
                <input type="radio" checked={profile.sourceType === 'local'} onChange={() => {handleFieldChange('sourceType', 'local'); setTreePaths([]);}} style={styles.radioInput}/>
                <span>LOCAL_ARCHIVE</span>
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', marginTop: '20px', alignItems: 'stretch' }}>
              {profile.sourceType === 'github' ? (
                <input 
                  style={{ ...styles.input, flex: 1 }} 
                  value={profile.repoUrl} 
                  onChange={e => {handleFieldChange('repoUrl', e.target.value); setTreePaths([]);}} 
                  placeholder="HTTPS://GITHUB.COM/OWNER/REPO"
                />
              ) : (
                <div style={{ ...styles.input, flex: 1, display: 'flex', alignItems: 'center', position: 'relative', padding: 0 }}>
                    <input 
                        type="file" 
                        accept=".zip"
                        onChange={e => {setLocalFile(e.target.files?.[0] || null); setTreePaths([]);}} 
                        style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer' }}
                    />
                    <div style={{ padding: '14px', color: localFile ? '#00f2ff' : '#666', fontSize: '0.9rem' }}>
                        {localFile ? localFile.name : 'SELECT_ZIP_FILE...'}
                    </div>
                </div>
              )}
              <button 
                style={{ ...styles.btnSecondary, background: isStep2Complete ? 'rgba(255,255,255,0.08)' : 'transparent' }} 
                onClick={loadStructure}
                disabled={!isStep2Complete || isLoading}
              >
                {isLoading && treePaths.length === 0 ? <span className="loading-dots">SCANNING</span> : '[ LOAD_STRUCTURE ]'}
              </button>
              {isStep3Complete && (
                <button 
                  style={{ ...styles.btnSecondary, background: 'rgba(255,255,255,0.08)' }} 
                  onClick={handleDownloadStructure}
                >
                  [ DOWNLOAD_TREE_ONLY ]
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3 */}
      {isStep3Complete && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionNum}>03 //</span>
            <h3 style={styles.sectionTitle}>FILE_SYSTEM_SELECTOR</h3>
          </div>
          <div style={styles.sectionContent}>
            <div style={styles.treeContainer} ref={scrollRef}>
              {treeNodes.map(node => (
                <CheckboxNode 
                  key={node.path} 
                  node={node} 
                  depth={0} 
                  checkedPaths={checkedSet} 
                  onChange={handleTreeChange} 
                />
              ))}
            </div>

            <div style={{ marginTop: '40px' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '15px', color: '#00f2ff', fontSize: '0.8rem', letterSpacing: '2px' }}>
                // GLOBAL_EXCLUSIONS
              </label>
              <div style={styles.tagInputContainer}>
                {profile.excludePatterns.map((p, i) => (
                  <span key={i} style={styles.tagItemExcluded}>
                    {p} <button style={styles.tagClose} onClick={() => removeExcludePattern(i)}>×</button>
                  </span>
                ))}
                <input 
                  style={styles.tagInput}
                  value={excludeInput}
                  onChange={e => setExcludeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addExcludePattern()}
                  placeholder="ADD_SKIP_PATTERN..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4 */}
      {isStep3Complete && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionNum}>04 //</span>
            <h3 style={styles.sectionTitle}>TRANSFORMATION_ENGINE</h3>
          </div>
          <div style={styles.sectionContent}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '10px', color: '#888', fontSize: '0.75rem' }}>// OUTPUT_TARGET</label>
                <input 
                  style={styles.input} 
                  value={profile.outputFilename} 
                  onChange={e => handleFieldChange('outputFilename', e.target.value)} 
                />
              </div>
              <div style={styles.actions}>
                <button 
                    style={styles.btnPrimary} 
                    onClick={handleGenerate} 
                    disabled={isLoading || profile.includePatterns.length === 0}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 242, 255, 0.6)')}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 242, 255, 0.3)')}
                >
                  {isLoading ? <span className="loading-dots">{loadingMessage || 'PROCESSING'}</span> : `RUN_GENERATE // [${profile.includePatterns.length}_FILES]`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '60px 40px', maxWidth: '1100px', margin: '0 auto' } as React.CSSProperties,
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  brand: { display: 'flex', flexDirection: 'column' as const },
  brandMain: { fontSize: '2rem', fontWeight: 800, color: '#000000', letterSpacing: '-1px' },
  brandSub: { fontSize: '0.7rem', color: '#00f2ff', fontWeight: 700, letterSpacing: '3px', marginTop: '5px' },
  section: { marginBottom: '60px' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' },
  sectionNum: { fontSize: '1.2rem', fontWeight: 700, color: '#00f2ff', opacity: 0.8 },
  sectionTitle: { margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#000000', letterSpacing: '1px', textShadow: '0 0 10px rgba(255,255,255,0.1)' },
  sectionContent: { borderLeft: '1px solid #222', paddingLeft: '40px', marginLeft: '12px' },
  input: { 
    width: '100%', 
    padding: '16px', 
    fontSize: '1rem', 
    background: '#000', 
    border: '1px solid #333', 
    borderRadius: '4px', 
    color: '#fff', 
    outline: 'none',
    transition: 'border-color 0.2s',
  } as React.CSSProperties,
  card: { background: '#0f0f0f', border: '1px solid #222', display: 'flex', flexDirection: 'column' as const, flex: 1, height: '75vh', position: 'relative' } as React.CSSProperties,
  radioGroup: { display: 'flex', gap: '40px' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#aaa' },
  radioInput: { accentColor: '#00f2ff' },
  treeContainer: { 
    border: '1px solid #222', 
    padding: '10px 0', 
    maxHeight: '600px', 
    overflowY: 'auto', 
    background: '#050505',
    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
  } as React.CSSProperties,
  tagInputContainer: { 
    display: 'flex', 
    flexWrap: 'wrap', 
    gap: '10px', 
    padding: '15px', 
    border: '1px solid #222', 
    background: '#050505',
    minHeight: '60px' 
  } as React.CSSProperties,
  tagItemExcluded: { 
    background: 'rgba(255, 49, 49, 0.1)', 
    color: '#ff3131', 
    padding: '6px 14px', 
    border: '1px solid rgba(255, 49, 49, 0.5)',
    fontSize: '0.8rem', 
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  tagClose: { background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 800, padding: 0 },
  tagInput: { flex: 1, border: 'none', outline: 'none', minWidth: '200px', fontSize: '0.9rem', background: 'transparent', color: '#fff' },
  actions: { marginTop: '10px' },
  btnPrimary: { 
    padding: '24px 48px', 
    background: '#00f2ff', 
    color: '#000', 
    border: 'none', 
    fontSize: '1.2rem', 
    cursor: 'pointer', 
    fontWeight: 800, 
    transition: 'all 0.2s',
    boxShadow: '0 0 15px rgba(0, 242, 255, 0.3)',
  } as React.CSSProperties,
  btnSecondary: { 
    padding: '14px 24px', 
    background: 'rgba(255,255,255,0.05)', 
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
  errorBanner: { 
    background: 'rgba(255, 49, 49, 0.1)', 
    color: '#ff3131', 
    padding: '20px', 
    border: '1px solid #ff3131',
    marginBottom: '40px', 
    fontWeight: 700,
    fontSize: '0.9rem',
    letterSpacing: '1px'
  },
};
