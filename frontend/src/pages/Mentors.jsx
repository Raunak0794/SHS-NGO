import { useState } from "react";
import { motion } from "framer-motion"; // ✅ import motion
import { GraduationCap, Briefcase, Award } from "lucide-react";

const initialMentors = [
  {
    id: 1,
    name: "RAHUL KUMAR (GUDDU BHAIYA)",
    role: "Founder & CEO",
    organization: "Srijan Home School",
    college: "JADAVPUR UNIVERSITY",
    icon: "👨‍🏫",
  },
  {
    id: 2,
    name: "SUJEET KUMAR",
    role: "MENTOR",
    organization: "Software Development Engineer at C-DOT",
    college: "Netaji Subhas Institute of Technology",
    icon: "👨‍💻",
  },
  {
    id: 3,
    name: "Avitanshu Adarsh (Manish Bhaiya)",
    role: "MENTOR",
    organization: "Government Officer",
    college: "IIT Delhi",
    icon: "👨‍⚖️",
  },
  {
    id: 4,
    name: "RANJAN RAJ",
    role: "MENTOR",
    organization: "ACTOR & CONTENT CREATOR",
    college: "IIT BOMBAY",
    icon: "🎬",
  },
  {
    id: 5,
    name: "Sudhir Kumar",
    role: "MENTOR",
    organization: "Government Officer",
    college: "IIT Delhi",
    icon: "👨‍🏫",
  },
  {
    id: 6,
    name: "Ujjawal Goyal",
    role: "MENTOR",
    organization: "Software Development Engineer at JUSPAY",
    college: "IIT KANPUR",
    icon: "👨‍💻",
  },
  {
    id: 7,
    name: "HARSH RAJ",
    role: "MENTOR",
    organization: "Data Scientist at VERDANTA",
    college: "IIT GUWAHATI",
    icon: "📊",
  },
  {
    id: 8,
    name: "ANISH KUMAR",
    role: "MENTOR",
    organization: "Data Scientist at SUTHERLAND",
    college: "IIT ISM DHANBAD",
    icon: "📈",
  },
  {
    id: 9,
    name: "VIKASH KUMAR",
    role: "MENTOR",
    organization: "Physics Teacher at ALLEN CHENNAI",
    college: "IIT KANPUR",
    icon: "⚛️",
  },
];

export default function Mentors() {
  const [mentors] = useState(initialMentors);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Education Mentors
            </span>
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Learn from the best minds in the industry. Our mentors are here to guide you towards success.
          </p>
        </div>

        {/* Mentor Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {mentors.map((mentor) => (
            <motion.div
              key={mentor.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="glass-card p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer group"
            >
              {/* Avatar / Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span>{mentor.icon}</span>
                </div>
              </div>

              {/* Content */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-1">{mentor.name}</h3>
                <p className="text-indigo-600 font-semibold text-sm mb-2">{mentor.role}</p>
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
                    <GraduationCap className="w-4 h-4" />
                    <span>{mentor.college}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
                    <Briefcase className="w-4 h-4" />
                    <span>{mentor.organization}</span>
                  </div>
                </div>
                {/* Decorative line */}
                <div className="w-12 h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 mx-auto mt-4 rounded-full"></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="glass-card p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Want to become a mentor?</h2>
            <p className="text-gray-600 mb-4">
              Join our community of educators and help shape the future of learning.
            </p>
            <button className="btn-primary inline-flex items-center gap-2">
              <Award className="w-4 h-4" />
              Apply Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}