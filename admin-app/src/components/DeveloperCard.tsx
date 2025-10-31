import { useState } from 'react';
import { Instagram, Mail, Github } from 'lucide-react';

interface CardProps {
  name: string;
  title: string;
  image: string;
  techStack: string;
  description1: string;
  description2: string;
  instagram: string;
  email: string;
  github: string;
  themeColors?: {
    primary: string;
    secondary: string;
  };
}

const SingleCard = ({ name, title, image, techStack, description1, description2, instagram, email, github, themeColors }: CardProps) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  
  // Default to blue theme if no colors provided
  const colors = themeColors || { primary: '59, 130, 246', secondary: '147, 197, 253' };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        className="relative w-full h-[600px] cursor-pointer select-none"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          perspective: '1500px',
        }}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-3xl transition-all duration-700 ease-out"
          style={{
            background: `linear-gradient(135deg, rgba(${colors.primary}, 0.5), rgba(${colors.secondary}, 0.3))`,
            filter: 'blur(30px)',
            opacity: isHovered ? 0.8 : 0.3,
            transform: 'scale(1.05)',
          }}
        />

        {/* Main card */}
        <div
          className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl transition-all duration-700 ease-out"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transformStyle: 'preserve-3d',
            background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
            filter: isHovered ? 'brightness(1.1)' : 'brightness(1)',
          }}
        >
          {/* Image section - Upper half */}
          <div 
            className="relative h-1/2 w-full overflow-hidden"
            style={{
              background: `linear-gradient(to bottom right, rgba(${colors.primary}, 0.1), rgba(${colors.secondary}, 0.15))`
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center p-8 pb-12">
              <div className="w-56 h-56 rounded-full overflow-hidden shadow-2xl border-8 border-white transition-transform duration-700 ease-out"
                style={{
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                }}>
                <img 
                  src={image}
                  alt={name}
                  className="w-full h-full object-cover object-center"
                  loading="eager"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const initials = name.split(' ').map(n => n[0]).join('');
                    target.src = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="224" height="224"%3E%3Crect width="224" height="224" fill="%233b82f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="80" fill="white"%3E${initials}%3C/text%3E%3C/svg%3E`;
                  }}
                />
              </div>
            </div>
            {/* Decorative elements */}
            <div 
              className="absolute top-6 right-6 w-24 h-24 rounded-full blur-xl" 
              style={{ background: `rgba(${colors.primary}, 0.2)` }}
            />
            <div 
              className="absolute bottom-6 left-6 w-28 h-28 rounded-full blur-xl" 
              style={{ background: `rgba(${colors.secondary}, 0.25)` }}
            />
          </div>

          {/* Info section - Lower half */}
          <div className="relative h-1/2 w-full bg-white px-8 py-6 flex flex-col justify-between">
            <div className="space-y-3 max-w-md mx-auto w-full pt-6">
              <h3 className="text-3xl font-bold text-gray-800 text-center">
                {name}
              </h3>
              <p className="text-lg text-blue-600 font-semibold text-center">
                {title}
              </p>
              <div className="pt-2 space-y-1.5 text-center">
                <p className="text-sm text-gray-600">
                  🚀 {techStack}
                </p>
                <p className="text-sm text-gray-600">
                  💼 {description1}
                </p>
                <p className="text-sm text-gray-600">
                  ✨ {description2}
                </p>
              </div>
            </div>

            {/* Social Media Icons */}
            <div className="flex justify-center items-center gap-5 pb-6">
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl"
                aria-label="Instagram"
              >
                <Instagram className="w-6 h-6" />
              </a>
              <a
                href={`mailto:${email}`}
                className="p-3.5 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl"
                aria-label="Email"
              >
                <Mail className="w-6 h-6" />
              </a>
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 text-white hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl"
                aria-label="GitHub"
              >
                <Github className="w-6 h-6" />
              </a>
            </div>
          </div>

          {/* Accent line */}
          <div 
            className="absolute top-1/2 left-0 right-0 h-1 transform -translate-y-1/2" 
            style={{
              background: `linear-gradient(to right, rgba(${colors.primary}, 0.8), rgba(${colors.secondary}, 1), rgba(${colors.primary}, 0.8))`
            }}
          />
        </div>
      </div>
    </div>
  );
};

const DeveloperCard = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
      {/* First Developer - Karrar Mayaly */}
      <SingleCard
        name="Karrar Mayaly"
        title="Full Stack Developer"
        image="/developer-photo-1.jpg"
        techStack="Python • Java • Node.js • React • TypeScript"
        description1="Building innovative solutions"
        description2="Passionate about clean code"
        instagram="https://www.instagram.com/kode_pcs"
        email="karrarmayaly@gmail.com"
        github="https://github.com/yousiff139-lang/"
        themeColors={{
          primary: '30, 144, 255',    // Dodger blue - matches the blue tones in the image
          secondary: '135, 206, 250'  // Sky blue
        }}
      />

      {/* Second Developer - Mohammed Majeed */}
      <SingleCard
        name="Mohammed Majeed"
        title="Frontend Developer"
        image="/developer-photo-2.jpg"
        techStack="HTML • CSS • JavaScript"
        description1="Crafting beautiful user interfaces"
        description2="Focused on user experience"
        instagram="https://www.instagram.com/m0ho0/"
        email="mokjun53@gmail.com"
        github="https://github.com/m0ho0"
        themeColors={{
          primary: '220, 38, 38',     // Red - adjust based on Mohammed's image colors
          secondary: '239, 68, 68'    // Lighter red
        }}
      />
    </div>
  );
};

export default DeveloperCard;
