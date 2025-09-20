"use client";

import { useState } from "react";
import { 
    Eye, 
    EyeOff, 
    Mail, 
    Lock, 
    User, 
    AlertCircle, 
    CheckCircle, 
    Shield,
    UserPlus,
    Settings,
    Database,
    Users,
    Loader2
} from "lucide-react";
import { auth, db } from "@/app/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function AdminRegisterManagement() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [focusedField, setFocusedField] = useState("");

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setSuccess("");

        // Validation
        if (!fullName || !email || !password || !confirmPassword) {
            setError("Please fill in all fields");
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters long");
            setIsLoading(false);
            return;
        }

        try {
            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update display name
            await updateProfile(user, {
                displayName: fullName
            });

            // Store admin data in Firestore
            await setDoc(doc(db, "users", user.uid), {
                fullName,
                email,
                accountType: "admin",
                createdAt: new Date().toISOString(),
                uid: user.uid,
                isActive: true,
                role: "admin"
            });

            // Success
            setSuccess(`Admin account created successfully for ${fullName}`);
            
            // Clear form
            setFullName("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            
        } catch (err) {
            if (err instanceof Error) {
                if (err.message.includes("email-already-in-use")) {
                    setError("This email is already registered");
                } else if (err.message.includes("invalid-email")) {
                    setError("Invalid email address");
                } else if (err.message.includes("weak-password")) {
                    setError("Password is too weak");
                } else {
                    setError(err.message);
                }
            } else {
                setError("Failed to create admin account. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-poppins">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                            <UserPlus className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Administrator Registration</h1>
                            <p className="text-gray-600">Create new admin accounts with full system privileges</p>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Registration Form - Left Side */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                            {/* Form Header */}
                            

                            {/* Form Content */}
                            <div className="p-8">
                                <form onSubmit={handleRegister} className="space-y-6">
                                    {/* Success Message */}
                                    {success && (
                                        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                                            <div className="flex items-start">
                                                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                                                <div>
                                                    <h3 className="text-sm font-medium text-green-800">Success!</h3>
                                                    <p className="text-sm text-green-700 mt-1">{success}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Error Message */}
                                    {error && (
                                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                                            <div className="flex items-start">
                                                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                                                <div>
                                                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                                                    <p className="text-sm text-red-700 mt-1">{error}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Full Name */}
                                    <div>
                                        <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                                                focusedField === "fullName" ? "text-purple-500" : "text-gray-400"
                                            }`} />
                                            <input
                                                id="fullName"
                                                type="text"
                                                required
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                onFocus={() => setFocusedField("fullName")}
                                                onBlur={() => setFocusedField("")}
                                                className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm transition-all duration-200 bg-gray-50 focus:bg-white ${
                                                    focusedField === "fullName"
                                                        ? "border-purple-500 shadow-lg"
                                                        : "border-gray-200 hover:border-gray-300"
                                                }`}
                                                placeholder="Enter administrator's full name"
                                            />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                            Email Address <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                                                focusedField === "email" ? "text-purple-500" : "text-gray-400"
                                            }`} />
                                            <input
                                                id="email"
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                onFocus={() => setFocusedField("email")}
                                                onBlur={() => setFocusedField("")}
                                                className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm transition-all duration-200 bg-gray-50 focus:bg-white ${
                                                    focusedField === "email"
                                                        ? "border-purple-500 shadow-lg"
                                                        : "border-gray-200 hover:border-gray-300"
                                                }`}
                                                placeholder="admin@example.com"
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                                            Password <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                                                focusedField === "password" ? "text-purple-500" : "text-gray-400"
                                            }`} />
                                            <input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                onFocus={() => setFocusedField("password")}
                                                onBlur={() => setFocusedField("")}
                                                className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl text-sm transition-all duration-200 bg-gray-50 focus:bg-white ${
                                                    focusedField === "password"
                                                        ? "border-purple-500 shadow-lg"
                                                        : "border-gray-200 hover:border-gray-300"
                                                }`}
                                                placeholder="Minimum 6 characters"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-500 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters long</p>
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                                            Confirm Password <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                                                focusedField === "confirmPassword" ? "text-purple-500" : "text-gray-400"
                                            }`} />
                                            <input
                                                id="confirmPassword"
                                                type={showConfirmPassword ? "text" : "password"}
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                onFocus={() => setFocusedField("confirmPassword")}
                                                onBlur={() => setFocusedField("")}
                                                className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl text-sm transition-all duration-200 bg-gray-50 focus:bg-white ${
                                                    focusedField === "confirmPassword"
                                                        ? "border-purple-500 shadow-lg"
                                                        : "border-gray-200 hover:border-gray-300"
                                                }`}
                                                placeholder="Re-enter password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-500 transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className={`w-full py-4 px-6 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center ${
                                                isLoading
                                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                                    : "bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl"
                                            }`}
                                        >
                                            {isLoading ? (
                                                <div className="flex items-center space-x-2">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    <span>Creating Admin Account...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2">
                                                    <UserPlus className="w-5 h-5" />
                                                    <span>Create Administrator Account</span>
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Information Panel - Right Side */}
                    <div className="space-y-6">
                        {/* Admin Privileges Card */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Admin Privileges</h3>
                                    <p className="text-sm text-gray-500">Full system access included</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-start space-x-3">
                                    <Users className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">User Management</p>
                                        <p className="text-xs text-gray-600">Create, edit, and manage all user accounts</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Database className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Inventory Control</p>
                                        <p className="text-xs text-gray-600">Full access to stock and inventory management</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Settings className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">System Settings</p>
                                        <p className="text-xs text-gray-600">Configure system-wide preferences and security</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security Notice Card */}
                        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
                            <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-purple-900 mb-2">Security Guidelines</h3>
                                    <ul className="text-xs text-purple-800 space-y-1">
                                        <li>• Use strong, unique passwords</li>
                                        <li>• Enable two-factor authentication</li>
                                        <li>• Regularly review admin permissions</li>
                                        <li>• Monitor account activity logs</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Best Practices Card */}
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Account Setup Best Practices</h3>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-xs text-gray-700">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                    <span>Use official company email addresses</span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-gray-700">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                    <span>Include full legal names for identification</span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-gray-700">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                    <span>Verify account details before creation</span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-gray-700">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                    <span>Document admin creation for audit trails</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}