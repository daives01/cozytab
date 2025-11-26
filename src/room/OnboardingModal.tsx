interface OnboardingModalProps {
    onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Nook! 🏡</h2>

                <div className="space-y-4 text-gray-600 mb-8">
                    <p>
                        Your personal cozy corner of the internet. Here's how to get started:
                    </p>

                    <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">1</span>
                            <span>Click <span className="font-semibold text-gray-800">Enter Edit Mode</span> to customize your room.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">2</span>
                            <span>Drag items from the palette at the bottom to add them.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">3</span>
                            <span>Select items to move, resize, or add <span className="font-semibold text-gray-800">links</span> to your favorite sites.</span>
                        </li>
                    </ul>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                    Let's Go!
                </button>
            </div>
        </div>
    );
}
