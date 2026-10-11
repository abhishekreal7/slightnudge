import { StudioLayout } from '@/components/slightnudge/StudioLayout';
import PlaygroundPage from '@/fixtures/1-plain-static';

export default function StudioPage() {
  return <StudioLayout activeFile="fixtures/1-plain-static.tsx"><PlaygroundPage /></StudioLayout>;
}
