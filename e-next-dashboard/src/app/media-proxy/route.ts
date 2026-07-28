import { NextRequest, NextResponse } from 'next/server';

function isAllowedSignatureHost(hostname: string): boolean {
  if (hostname === 'enext-media.s3.ap-south-1.amazonaws.com') return true;
  if (hostname === 'enext-media.s3.amazonaws.com') return true;
  // Virtual-hosted / regional S3 variants for this bucket only
  return (
    hostname.endsWith('.amazonaws.com') &&
    hostname.startsWith('enext-media.')
  );
}

/**
 * Same-origin proxy for S3 signature images.
 * Browser fetch() to S3 fails (CORS); <img src> works. PDF needs bytes, so we proxy.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ message: 'url required' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ message: 'invalid url' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:' || !isAllowedSignatureHost(parsed.hostname)) {
    return NextResponse.json({ message: 'host not allowed' }, { status: 400 });
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return NextResponse.json(
        { message: 'upstream failed' },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get('content-type') || 'image/png';
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch {
    return NextResponse.json({ message: 'proxy failed' }, { status: 502 });
  }
}
