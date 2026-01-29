'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function ModelsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1); 
    const [showModal, setShowModal] = useState(false); // State for modal visibility
    const [modelToDelete, setModelToDelete] = useState(null); // State to hold the model that will be deleted
    const modelsPerPage = 5;

    const models = [
        { id: 1, name: 'User1', key: 'AI1', model: 'Grok', status: 'active' },
        { id: 2, name: 'User2', key: 'AI2', model: 'Local', status: 'inactive' },
        { id: 3, name: 'User3', key: 'AI3', model: 'Grok', status: 'active' },
        { id: 4, name: 'User4', key: 'AI4', model: 'Local', status: 'inactive' },
        { id: 5, name: 'User5', key: 'AI5', model: 'Grok', status: 'active' },
        { id: 6, name: 'User6', key: 'AI6', model: 'Local', status: 'inactive' },
        { id: 7, name: 'User7', key: 'AI7', model: 'Grok', status: 'active' },
        { id: 8, name: 'User8', key: 'AI8', model: 'Local', status: 'inactive' },
        { id: 9, name: 'User9', key: 'AI9', model: 'Grok', status: 'active' },
        { id: 10, name: 'User10', key: 'AI10', model: 'Local', status: 'inactive' },
    ];

    const indexOfLastModel = currentPage * modelsPerPage;
    const indexOfFirstModel = indexOfLastModel - modelsPerPage;
    const currentModels = models.slice(indexOfFirstModel, indexOfLastModel);
    const totalPages = Math.ceil(models.length / modelsPerPage);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prevPage => prevPage + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prevPage => prevPage - 1);
        }
    };

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleDeleteClick = (model) => {
        setModelToDelete(model); // Set the model to be deleted
        setShowModal(true); // Show the confirmation modal
    };

    const handleConfirmDelete = () => {
        // Here, you would call the function to delete the model
        console.log(`Model ${modelToDelete.name} deleted`);
        setShowModal(false); // Close the modal after deletion
    };

    const handleCancelDelete = () => {
        setShowModal(false); // Just close the modal without doing anything
    };

    return (
        <>
            {/* Header Bar */}
            <div className="w-full" style={{ backgroundColor: 'var(--color-bg-card)', boxShadow: 'var(--shadow-cyan-glow)' }}>
                <div className="flex flex-row justify-between items-center p-[10px_20px] gap-6 w-full h-[66px]">
                    <div className="flex flex-row items-start p-[10px_20px] gap-[10px] h-[46px]">
                        <Link href="/dashboard" className="w-7 h-7 flex items-center justify-center text-[#E5E7EB] hover:opacity-80 transition-opacity">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
                            </svg>
                        </Link>
                        <h1 className="font-medium text-[22px] leading-7 m-0" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
                            Manage Your Model
                        </h1>
                    </div>

                    <div className="flex flex-row items-center p-0 gap-4 h-[46px]">
                        <div className="flex flex-row items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                <Image
                                    src="/kathy-avatar.png"
                                    alt="Admin"
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex flex-col items-start gap-[2px]">
                                <p className="font-bold text-[16px] leading-[22px] tracking-[-0.007em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                    Admin
                                </p>
                                <p className="font-medium text-[14px] leading-5 tracking-[-0.006em] m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                                    Admin@gmail.com
                                </p>
                            </div>
                        </div>
                        <button
                            className="flex justify-center items-center p-2 w-10 h-10 min-h-0 rounded-full bg-transparent border-none cursor-pointer hover:opacity-80 transition-all duration-300"
                            style={{ color: 'var(--color-destructive)' }}
                            aria-label="Logout"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-[30px]">
                <div className="flex flex-col items-start p-[20px] gap-[15px] w-full max-w-[1080px] mx-auto rounded-[20px]" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                    <h2 className="font-bold text-[18px] leading-5 tracking-[-0.006em] text-white m-0" style={{ fontFamily: 'var(--font-family-poppins)' }}>Model</h2>
                    {/* Header - Search + Add Button */}
                    <div className="flex flex-row justify-between items-center p-0 gap-6 w-full h-10">
                        {/* Search Input */}
                        <div className="flex flex-col items-end p-0 gap-[6px] w-80 h-10">
                            <div className="box-border flex flex-row items-center p-[8px_12px] gap-3 w-80 h-10 min-h-10 rounded-lg" style={{ backgroundColor: 'var(--color-bg-dark-primary)', border: '1px solid var(--color-border-slate)' }}>
                                <div className="flex flex-row items-center p-0 gap-2 w-[264px] h-[22px] flex-1">
                                    <input
                                        type="text"
                                        placeholder="Search Model"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-[22px] bg-transparent border-none outline-none font-medium text-[16px] leading-[22px] tracking-[-0.007em]"
                                        style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}
                                    />
                                </div>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                                    <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>

                        {/* Add Model Button */}
                        <Link href="/dashboard/models/add" className="flex flex-row justify-center items-center p-[10px_16px] gap-2 w-[134px] h-10 rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity no-underline" style={{ backgroundColor: 'var(--color-button-primary)', fontFamily: 'var(--font-family-jakarta)' }}>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="10" cy="10" r="9" stroke="white" strokeWidth="2" />
                                <path d="M10 6v8M6 10h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <span className="font-bold text-[14px] leading-5 tracking-[-0.006em] text-white">Add Model</span>
                        </Link>
                    </div>
                    {/* Table */}
                    <div className="box-border flex flex-col items-start p-0 w-full rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-dark-primary)', border: '1px solid #D9DDE0' }}>
                        <div className="flex flex-row items-start p-2 gap-2 w-full h-12">
                            <div className="flex flex-col justify-center items-start p-0 gap-[10px] w-9 h-8">
                                <span className="font-semibold text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB]">No</span>
                            </div>
                            <div className="flex flex-col justify-center items-start p-0 gap-[10px] w-[101px] h-8">
                                <span className="font-semibold text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB]">Nama Bot</span>
                            </div>
                            <div className="flex flex-col justify-center items-start p-0 gap-[10px] w-[252px] h-8">
                                <span className="font-semibold text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB]">Key</span>
                            </div>
                            <div className="flex flex-col justify-center items-start p-0 gap-[10px] w-[189px] h-8">
                                <span className="font-semibold text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB]">Model</span>
                            </div>
                            <div className="flex flex-col justify-center items-start p-0 gap-[10px] w-[243px] h-8">
                                <span className="font-semibold text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB]">Status</span>
                            </div>
                            <div className="flex flex-col justify-center items-start p-0 gap-[10px] w-[100px] h-8">
                                <span className="font-semibold text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB]">Aksi</span>
                            </div>
                        </div>
                        <div className="w-full h-0 border-t" style={{ borderColor: '#D9DDE0' }}></div>

                        {/* Table Rows */}
                        <div className="flex flex-col items-start p-0 w-full">
                            {currentModels.map((model, index) => (
                                <div key={model.id}>
                                    <div className="flex flex-row items-start p-2 gap-2 w-full h-[52px]">
                                        {/* No */}
                                        <div className="flex flex-col items-start p-0 gap-[10px] w-9 h-9 self-stretch">
                                            <div className="flex flex-row justify-center items-center p-[8px_4px] w-9 h-8 self-stretch">
                                                <span className="font-medium text-[12px] leading-4 tracking-[-0.005em] text-[#E5E7EB]" style={{ fontFamily: 'var(--font-family-jakarta)' }}>{model.id}</span>
                                            </div>
                                        </div>
                                        {/* Name */}
                                        <div className="flex flex-col items-start p-0 gap-[10px] w-[101px] h-9 self-stretch">
                                            <div className="flex flex-row items-start p-[8px_4px] w-[101px] h-8 self-stretch">
                                                <span className="font-medium text-[12px] leading-4 tracking-[-0.005em] text-[#E5E7EB]" style={{ fontFamily: 'var(--font-family-jakarta)' }}>{model.name}</span>
                                            </div>
                                        </div>
                                        {/* Key */}
                                        <div className="flex flex-col items-start p-0 gap-[10px] w-[252px] h-9 self-stretch">
                                            <div className="flex flex-row items-start p-[8px_4px] w-[91px] h-8">
                                                <span className="font-medium text-[12px] leading-4 tracking-[-0.005em] text-[#E5E7EB]" style={{ fontFamily: 'var(--font-family-jakarta)' }}>{model.key}</span>
                                            </div>
                                        </div>
                                        {/* Model */}
                                        <div className="flex flex-col items-start p-0 gap-[10px] w-[189px] h-9 self-stretch">
                                            <div className="flex flex-row items-start p-[8px_4px] w-[91px] h-8">
                                                <span className="font-medium text-[12px] leading-4 tracking-[-0.005em] text-[#E5E7EB]" style={{ fontFamily: 'var(--font-family-jakarta)' }}>{model.model}</span>
                                            </div>
                                        </div>
                                        {/* Status */}
                                        <div className="flex flex-col items-start p-0 gap-[10px] w-[243px] h-9 self-stretch">
                                            <div className="flex flex-row items-start p-[8px_4px] w-[243px] h-8 self-stretch">
                                                <span
                                                    className="font-medium text-[12px] leading-4 tracking-[-0.005em]"
                                                    style={{
                                                        fontFamily: 'var(--font-family-jakarta)',
                                                        color: model.status === 'active' ? '#22C55E' : '#EF4444'
                                                    }}
                                                >
                                                    {model.status === 'active' ? 'Aktif' : 'Non Aktif'}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Actions */}
                                        <div className="flex flex-col items-start p-0 gap-[10px] w-10 h-9 self-stretch">
                                            <div className="flex flex-row items-center p-[4px_0] gap-2 w-10 h-9">
                                                <Link href={`/dashboard/models/view/${model.id}`} className="flex flex-row justify-center items-center p-[6px_12px] gap-2 w-10 h-7 bg-[#3B82F6] rounded-full border-none cursor-pointer hover:opacity-80 transition-opacity">
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M8 3C4.5 3 1.73 5.61 1 9c.73 3.39 3.5 6 7 6s6.27-2.61 7-6c-.73-3.39-3.5-6-7-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z" fill="#E5E7EB" />
                                                    </svg>
                                                </Link>
                                            </div>
                                        </div>
                                        {/* Edit Button */}
                                        <div className="flex flex-col items-start p-0 gap-[10px] w-10 h-9 self-stretch">
                                            <div className="flex flex-row items-center p-[4px_0] gap-2 w-10 h-9">
                                                <Link href={`/dashboard/models/edit/${model.id}`} className="flex flex-row justify-center items-center p-[6px_12px] gap-2 w-10 h-7 bg-[#F59E0B] rounded-full border-none cursor-pointer hover:opacity-80 transition-opacity">
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M2 11.5V14h2.5l7.37-7.37-2.5-2.5L2 11.5zM13.71 5.04c.26-.26.26-.68 0-.94l-1.56-1.56c-.26-.26-.68-.26-.94 0l-1.22 1.22 2.5 2.5 1.22-1.22z" fill="#E5E7EB" />
                                                    </svg>
                                                </Link>
                                            </div>
                                        </div>
                                        {/* Delete Button */}
                                        <div className="flex flex-col items-start p-0 gap-[10px] w-10 h-9 self-stretch">
                                            <div className="flex flex-row items-center p-[4px_0] gap-2 w-10 h-9">
                                                <button
                                                    className="flex flex-row justify-center items-center p-[6px_12px] gap-2 w-10 h-7 bg-[#EF4444] rounded-full border-none cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={() => handleDeleteClick(model)} // Trigger delete popup
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M4 12.5c0 .83.67 1.5 1.5 1.5h5c.83 0 1.5-.67 1.5-1.5v-9H4v9zM12.5 2h-2.75l-.75-.75h-2L6.25 2H3.5v1.5h9V2z" fill="#E5E7EB" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {index < models.length - 1 && <div className="w-full h-0 border-t" style={{ borderColor: '#D9DDE0' }}></div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-row justify-between items-start p-0 gap-6 w-full h-10">
                        <div className="flex flex-row items-start p-0 gap-4">
                            <button
                                className="flex flex-row justify-center items-center p-[8px_16px_8px_10px] gap-1 w-[134px] h-10 min-h-10 rounded-full border-none cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={handlePreviousPage}
                            >
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12.5 15l-5-5 5-5" stroke="#595959" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span className="font-semibold text-[14px] leading-5 tracking-[-0.006em] text-[#595959]">Previous</span>
                            </button>

                            <div className="flex flex-row items-start p-0 gap-0">
                                {[...Array(totalPages).keys()].map(pageNumber => (
                                    <button
                                        key={pageNumber}
                                        className={`flex flex-col justify-center items-center p-[0_0_1px] gap-[10px] w-10 h-10 rounded-full border-none cursor-pointer hover:opacity-80 transition-opacity ${currentPage === pageNumber + 1 ? 'bg-[#22C55E]' : ''}`}
                                        onClick={() => handlePageChange(pageNumber + 1)}
                                    >
                                        <span className={`font-medium text-[16px] leading-[22px] tracking-[-0.007em] ${currentPage === pageNumber + 1 ? 'text-[#0056A3]' : 'text-[#595959]'}`}>
                                            {pageNumber + 1}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <button
                                className="flex flex-row justify-center items-center p-[8px_10px_8px_16px] gap-1 w-[82px] h-10 min-h-10 rounded-full border-none cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={handleNextPage}
                            >
                                <span className="font-semibold text-[14px] leading-5 tracking-[-0.006em] text-[#595959]">Next</span>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7.5 15l5-5-5-5" stroke="#595959" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex flex-row justify-end items-center p-[8px_10px] gap-1 mx-auto w-[188px] h-10 min-h-10 rounded-full" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                            <span className="font-semibold text-[14px] leading-5 tracking-[-0.006em] text-[#595959]">
                                Showing {currentModels.length} of {models.length} items
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50">
                    <div className="bg-[#1F2937] p-6 rounded-lg max-w-sm w-full">
                        <h3 className="font-bold text-lg">Confirm Deletion</h3>
                        <p>Are you sure you want to delete this model?</p>
                        <div className="flex justify-end gap-4 mt-4">
                            <button
                                className="px-4 py-2 bg-[#22C55E] rounded-lg hover:bg-[#16A34A] text-white"
                                onClick={handleCancelDelete}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 bg-[#EF4444] text-white rounded-lg hover:bg-red-600"
                                onClick={handleConfirmDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
