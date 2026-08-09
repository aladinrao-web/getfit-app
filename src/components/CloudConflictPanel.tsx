import { AlertTriangle, CloudDownload, CloudUpload } from 'lucide-react'
import type { PersonalCloudConflict } from '../cloud/usePersonalCloud'
import type { ConflictResolutionChoice, FitnessStateSummary } from '../cloud/sync'
import { Button } from './ui'

interface CloudConflictPanelProps {
  conflict: PersonalCloudConflict
  deviceSummary: FitnessStateSummary
  resolutionBusy: boolean
  onResolve: (choice: ConflictResolutionChoice) => void
}

function SnapshotFacts({ summary }: { summary: FitnessStateSummary }) {
  return <ul><li>{summary.checkIns} check-ins</li><li>{summary.workouts} workouts</li><li>{summary.progressionTargets} exercise targets</li><li>{summary.hasWorkoutDraft ? 'Workout draft included' : 'No workout draft'}</li></ul>
}

export function CloudConflictPanel({ conflict, deviceSummary, resolutionBusy, onResolve }: CloudConflictPanelProps) {
  return <div className="cloud-conflict-panel" role="alert">
    <div className="cloud-conflict-intro"><span className="icon-tile red"><AlertTriangle size={20} /></span><div><strong>Choose which complete copy becomes current</strong><p>Nothing will be merged automatically. The copy you replace will remain available under Latest safety copy.</p></div></div>
    <div className="cloud-conflict-comparison">
      <div><span>On this device</span><strong>{conflict.deviceUpdatedAt ? new Date(conflict.deviceUpdatedAt).toLocaleString() : 'Save time unavailable'}</strong><SnapshotFacts summary={deviceSummary} /></div>
      <div><span>In the cloud</span><strong>{new Date(conflict.cloudUpdatedAt).toLocaleString()}</strong><small>Revision {conflict.cloudRevision}</small><SnapshotFacts summary={conflict.cloudSummary} /></div>
    </div>
    <div className="cloud-conflict-actions"><Button variant="secondary" disabled={resolutionBusy} onClick={() => onResolve('use-cloud')}><CloudDownload size={18} />Use cloud version</Button><Button variant="danger" disabled={resolutionBusy} onClick={() => onResolve('keep-device')}><CloudUpload size={18} />Keep this device</Button></div>
  </div>
}
