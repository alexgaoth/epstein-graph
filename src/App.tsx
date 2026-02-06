import GraphContainer from './components/GraphContainer';
import InfoPanel from './components/InfoPanel';
import SearchBar from './components/SearchBar';
import Legend from './components/Legend';
import Tooltip from './components/Tooltip';
import Minimap from './components/Minimap';
import ResetButton from './components/ResetButton';
import AddNodeButton from './components/AddNodeButton';
import AddNodeModal from './components/AddNodeModal';
import AddEdgeModal from './components/AddEdgeModal';

export default function App() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-graph-bg">
      {/* Core graph visualization (full viewport) */}
      <GraphContainer />

      {/* UI overlay chrome */}
      <SearchBar />
      <Minimap />
      <Legend />
      <AddNodeButton />
      <ResetButton />
      <Tooltip />
      <InfoPanel />

      {/* Modals */}
      <AddNodeModal />
      <AddEdgeModal />

      {/* Source attribution */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 text-[10px] text-graph-text-dim/40 pointer-events-none select-none">
        Data sourced from public DOJ records — justice.gov
      </div>
    </div>
  );
}
