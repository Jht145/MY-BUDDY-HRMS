import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { photo } = await req.json();

    if (!photo || !photo.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid photo data format' }, { status: 400 });
    }

    // Extract base64 content
    const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Setup target folder
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'checkins');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Write file to disk
    const filename = `checkin_${Date.now()}.jpg`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    const fileUrl = `/uploads/checkins/${filename}`;
    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('Checkin photo upload API error:', error);
    return NextResponse.json({ error: 'Failed to write photo file to disk' }, { status: 500 });
  }
}
