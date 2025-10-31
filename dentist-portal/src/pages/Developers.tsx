import DeveloperCard from '@/components/DeveloperCard';

const Developers = () => {
  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Meet the Developers</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            This platform was crafted with passion and expertise by our talented team,
            dedicated to creating innovative healthcare solutions.
          </p>
        </div>
        <DeveloperCard />
      </div>
    </div>
  );
};

export default Developers;
