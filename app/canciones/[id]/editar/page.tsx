'use client';

import { useParams } from 'next/navigation';
import CancionForm from '../../CancionForm';

export default function EditarCancionPage() {
  const { id } = useParams<{ id: string }>();
  return <CancionForm versionIdToEdit={id} />;
}
