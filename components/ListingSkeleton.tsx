import SkeletonCard from './SkeletonCard';

export default function ListingSkeleton({ active = true }: { active?: boolean }) {
  return <SkeletonCard active={active} testID="listing-skeleton" label="İlan analizi hazırlanıyor" />;
}
