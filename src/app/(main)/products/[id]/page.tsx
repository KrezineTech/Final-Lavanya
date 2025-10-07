export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Product Details</h1>
      <p className="text-gray-600">Product ID: {id}</p>
      <p className="text-gray-600">Product detail page coming soon...</p>
    </div>
  );
}