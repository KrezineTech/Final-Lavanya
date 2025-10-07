// Admin Panel Video Management Helper
// Add this to your admin panel to manage video-product linking

export async function linkVideoToProduct(videoId: string, productId: string) {
  const response = await fetch('/api/media/' + videoId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId })
  });
  return response.json();
}

export async function getUnlinkedVideos() {
  const response = await fetch('/api/test/video-status');
  const data = await response.json();
  return data.videos?.filter((v: any) => !v.productId) || [];
}

export async function getVideoStatus() {
  const response = await fetch('/api/test/video-status');
  return response.json();
}