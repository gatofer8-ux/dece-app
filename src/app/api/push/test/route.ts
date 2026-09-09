import { NextResponse } from 'next/server';
import { sendPushToUser } from '@/lib/push';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  
  await sendPushToUser(session.user.id, {
    title: '¡Prueba Exitosa!',
    body: 'Las notificaciones push están funcionando correctamente en tu navegador.',
    url: '/'
  });
  
  return NextResponse.json({ success: true });
}