"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/Sidebar";
import { useQuery, useMutation } from "@apollo/client";
import { DRIVERS_LIST, STAFF_USERS, CREATE_DRIVER, UPDATE_DRIVER, DELETE_DRIVER } from "@/lib/graphql";
import {
    Plus,
    Edit,
    Trash2,
    Users,
    Loader2,
    Truck,
    RefreshCw,
    X,
} from "lucide-react";

export default function DriversPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState<any>(null);
    const [deletingDriver, setDeletingDriver] = useState<any>(null);

    // Form states
    const [selectedUserId, setSelectedUserId] = useState("");
    const [vehicleType, setVehicleType] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    const { data, loading, refetch } = useQuery(DRIVERS_LIST, {
        variables: { first: 100 },
        skip: !isAuthenticated,
    });

    const { data: staffData } = useQuery(STAFF_USERS, {
        variables: { first: 100 },
        skip: !isAuthenticated || !showAddModal,
    });

    const [createDriver, { loading: creating }] = useMutation(CREATE_DRIVER, {
        onCompleted: () => {
            setShowAddModal(false);
            resetForm();
            refetch();
        },
    });

    const [updateDriver, { loading: updating }] = useMutation(UPDATE_DRIVER, {
        onCompleted: () => {
            setShowEditModal(false);
            setEditingDriver(null);
            resetForm();
            refetch();
        },
    });

    const [deleteDriver, { loading: deleting }] = useMutation(DELETE_DRIVER, {
        onCompleted: () => {
            setShowDeleteModal(false);
            setDeletingDriver(null);
            refetch();
        },
    });

    const resetForm = () => {
        setSelectedUserId("");
        setVehicleType("");
        setVehicleNumber("");
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--secondary-50)' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-500)' }} />
            </div>
        );
    }

    const drivers = data?.allDrivers?.edges || [];
    const existingUserIds = drivers.map((e: any) => e.node.user?.id);
    const availableUsers = staffData?.staffUsers?.edges?.filter(
        (e: any) => !existingUserIds.includes(e.node.id)
    ) || [];

    const stats = {
        total: drivers.length,
        online: drivers.filter((e: any) => e.node.isOnline).length,
        active: drivers.filter((e: any) => e.node.isActive).length,
        activeDel: drivers.reduce((sum: number, e: any) => sum + (e.node.activeDeliveriesCount || 0), 0),
    };

    const handleCreate = () => {
        if (!selectedUserId) return;
        createDriver({
            variables: {
                input: {
                    userId: selectedUserId,
                    vehicleType: vehicleType || undefined,
                    vehiclePlateNumber: vehicleNumber || undefined,
                },
            },
        });
    };

    const handleEdit = (driver: any) => {
        setEditingDriver(driver);
        setVehicleType(driver.vehicleType || "");
        setVehicleNumber(driver.vehicleNumber || "");
        setShowEditModal(true);
    };

    const handleUpdate = () => {
        if (!editingDriver) return;
        updateDriver({
            variables: {
                id: editingDriver.id,
                input: {
                    vehicleType: vehicleType || undefined,
                    vehicleNumber: vehicleNumber || undefined,
                },
            },
        });
    };

    const handleDelete = () => {
        if (!deletingDriver) return;
        deleteDriver({
            variables: { id: deletingDriver.id },
        });
    };

    return (
        <MainLayout>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Drivers</h1>
                    <p style={{ color: 'var(--secondary-500)' }} className="mt-1">Manage your delivery drivers</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Add Driver
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                    <p className="stat-label">Total</p>
                    <p className="stat-value">{loading ? "..." : stats.total}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Online</p>
                    <p className="stat-value text-green-600">{loading ? "..." : stats.online}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Active</p>
                    <p className="stat-value text-blue-600">{loading ? "..." : stats.active}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Deliveries</p>
                    <p className="stat-value" style={{ color: 'var(--primary-600)' }}>{loading ? "..." : stats.activeDel}</p>
                </div>
            </div>

            {/* Drivers Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-500)' }} />
                </div>
            ) : drivers.length === 0 ? (
                <div className="card p-12 text-center">
                    <Users className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--secondary-300)' }} />
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--secondary-700)' }}>No drivers yet</h3>
                    <p className="mt-1 mb-4" style={{ color: 'var(--secondary-500)' }}>Add your first driver to get started</p>
                    <button onClick={() => setShowAddModal(true)} className="btn-primary inline-flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Add Driver
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {drivers.map((edge: any) => {
                        const driver = edge.node;
                        return (
                            <div key={driver.id} className="card p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: 'var(--primary-100)' }}
                                        >
                                            <span className="font-semibold text-lg" style={{ color: 'var(--primary-600)' }}>
                                                {driver.user?.firstName?.[0] || "D"}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold" style={{ color: 'var(--secondary-900)' }}>
                                                {driver.user?.firstName} {driver.user?.lastName}
                                            </h3>
                                            <p className="text-sm" style={{ color: 'var(--secondary-500)' }}>{driver.user?.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className={`w-3 h-3 rounded-full ${driver.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--secondary-600)' }}>
                                        <Truck className="w-4 h-4" style={{ color: 'var(--secondary-400)' }} />
                                        <span>{driver.vehicleType || 'Not set'}</span>
                                        <span style={{ color: 'var(--secondary-300)' }}>•</span>
                                        <span>{driver.vehicleNumber || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {driver.isActive ? (
                                            <span className="badge-success">Active</span>
                                        ) : (
                                            <span className="badge-secondary">Inactive</span>
                                        )}
                                        {driver.isOnline && <span className="badge-info">Online</span>}
                                        {driver.activeDeliveriesCount > 0 && (
                                            <span className="badge-primary">{driver.activeDeliveriesCount} deliveries</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-4" style={{ borderTop: '1px solid var(--secondary-100)' }}>
                                    <button
                                        onClick={() => handleEdit(driver)}
                                        className="btn-secondary flex-1 text-sm py-2 flex items-center justify-center gap-1"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDeletingDriver(driver);
                                            setShowDeleteModal(true);
                                        }}
                                        className="btn-danger text-sm py-2 px-3"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Driver Modal */}
            {showAddModal && (
                <Modal onClose={() => { setShowAddModal(false); resetForm(); }}>
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--secondary-900)' }}>Add New Driver</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--secondary-700)' }}>
                                Select Staff User
                            </label>
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="select-field"
                            >
                                <option value="">Choose a user...</option>
                                {availableUsers.map((e: any) => (
                                    <option key={e.node.id} value={e.node.id}>
                                        {e.node.firstName} {e.node.lastName} ({e.node.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--secondary-700)' }}>
                                Vehicle Type
                            </label>
                            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="select-field">
                                <option value="">Select type...</option>
                                <option value="BIKE">Motorcycle / Bike</option>
                                <option value="THREE_WHEELER">Three Wheeler</option>
                                <option value="VAN">Van</option>
                                <option value="TRUCK">Truck</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--secondary-700)' }}>
                                Vehicle Number
                            </label>
                            <input
                                type="text"
                                value={vehicleNumber}
                                onChange={(e) => setVehicleNumber(e.target.value)}
                                className="input-field"
                                placeholder="e.g., WP-AB-1234"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button onClick={() => { setShowAddModal(false); resetForm(); }} className="btn-secondary flex-1">
                            Cancel
                        </button>
                        <button onClick={handleCreate} disabled={!selectedUserId || creating} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add Driver
                        </button>
                    </div>
                </Modal>
            )}

            {/* Edit Driver Modal */}
            {showEditModal && editingDriver && (
                <Modal onClose={() => { setShowEditModal(false); setEditingDriver(null); resetForm(); }}>
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--secondary-900)' }}>Edit Driver</h2>
                    <p className="mb-4" style={{ color: 'var(--secondary-600)' }}>
                        {editingDriver.user?.firstName} {editingDriver.user?.lastName}
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--secondary-700)' }}>
                                Vehicle Type
                            </label>
                            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="select-field">
                                <option value="">Select type...</option>
                                <option value="BIKE">Motorcycle / Bike</option>
                                <option value="THREE_WHEELER">Three Wheeler</option>
                                <option value="VAN">Van</option>
                                <option value="TRUCK">Truck</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--secondary-700)' }}>
                                Vehicle Number
                            </label>
                            <input
                                type="text"
                                value={vehicleNumber}
                                onChange={(e) => setVehicleNumber(e.target.value)}
                                className="input-field"
                                placeholder="e.g., WP-AB-1234"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button onClick={() => { setShowEditModal(false); setEditingDriver(null); resetForm(); }} className="btn-secondary flex-1">
                            Cancel
                        </button>
                        <button onClick={handleUpdate} disabled={updating} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Save Changes
                        </button>
                    </div>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && deletingDriver && (
                <Modal onClose={() => { setShowDeleteModal(false); setDeletingDriver(null); }}>
                    <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--secondary-900)' }}>Delete Driver?</h2>
                    <p className="mb-6" style={{ color: 'var(--secondary-600)' }}>
                        Are you sure you want to remove <strong>{deletingDriver.user?.firstName} {deletingDriver.user?.lastName}</strong> as a driver?
                        This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => { setShowDeleteModal(false); setDeletingDriver(null); }} className="btn-secondary flex-1">
                            Cancel
                        </button>
                        <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1 flex items-center justify-center gap-2">
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete
                        </button>
                    </div>
                </Modal>
            )}
        </MainLayout>
    );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 hover:opacity-70"
                    style={{ color: 'var(--secondary-400)' }}
                >
                    <X className="w-5 h-5" />
                </button>
                {children}
            </div>
        </div>
    );
}
