export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
      <span className="ml-3 text-gray-600">Loading...</span>
    </div>
  );
}
