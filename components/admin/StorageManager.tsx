'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FiHardDrive, FiLoader, FiAlertCircle, FiTrash2, FiCheck, FiSearch, FiRefreshCw, FiDatabase, FiBox } from 'react-icons/fi'

interface StorageManagerProps {
    onOpenChange?: (open: boolean) => void
}

export default function StorageManager({ onOpenChange }: StorageManagerProps) {
    const [scanLoading, setScanLoading] = useState(false)
    const [unusedImages, setUnusedImages] = useState<any[]>([])
    const [stats, setStats] = useState({ totalFiles: 0, totalSize: 0 })
    const [searchQuery, setSearchQuery] = useState('')
    const supabase = createClient()

    useEffect(() => {
        checkStorageReferences()
    }, [])

    const getAllFilesRecursive = async (folder = ''): Promise<any[]> => {
        const { data: list, error } = await supabase.storage.from('question-images').list(folder)
        if (error) throw error
        
        let all: any[] = []
        for (const item of list) {
            if (!item.id) { // Folder (metadata check: no id usually means directory in Supabase)
                const subPath = folder ? `${folder}/${item.name}` : item.name
                const sub = await getAllFilesRecursive(subPath)
                all = [...all, ...sub]
            } else {
                if (item.name === '.emptyFolderPlaceholder') continue
                const fullPath = folder ? `${folder}/${item.name}` : item.name
                const { data: { publicUrl } } = supabase.storage.from('question-images').getPublicUrl(fullPath)
                all.push({ ...item, fullPath, publicUrl })
            }
        }
        return all
    }

    const checkStorageReferences = async () => {
        setScanLoading(true)
        try {
            // 1. 递归获取整个存储桶的所有文件
            const allFiles = await getAllFilesRecursive('')
            
            // 2. 获取数据库中所有题目（跨题库核对）
            const { data: allQuestions, error: dbError } = await supabase
                .from('questions')
                .select('title, parse')
            
            if (dbError) throw dbError

            if (!allFiles || !allQuestions) {
                setUnusedImages([])
                return
            }

            // 3. 全局比对引用情况
            const unused = allFiles.filter(file => {
                const isReferenced = allQuestions.some(q => 
                    (q.title && q.title.includes(file.name)) || 
                    (q.parse && q.parse.includes(file.name))
                )
                return !isReferenced
            })

            setUnusedImages(unused)
            setStats({
                totalFiles: allFiles.length,
                totalSize: allFiles.reduce((acc, f) => acc + (f.metadata?.size || 0), 0)
            })
        } catch (error) {
            console.error('全域扫描失败:', error)
            alert('全域资源审计失败，请检查网络权限')
        } finally {
            setScanLoading(false)
        }
    }

    const handleDeleteStorageFile = async (item: any) => {
        if (!confirm(`确定永久删除资源 ${item.name} 吗？`)) return
        try {
            const { error } = await supabase.storage
                .from('question-images')
                .remove([item.fullPath])
            if (error) throw error
            setUnusedImages(prev => prev.filter(img => img.fullPath !== item.fullPath))
        } catch (error) {
            console.error('物理删除失败:', error)
            alert('删除失败')
        }
    }

    const filteredImages = unusedImages.filter(img => 
        img.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Banner */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-purple-500/10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl">
                            <FiHardDrive className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">全域存储审计中心</h2>
                            <p className="text-purple-100 opacity-90 text-sm mt-1">
                                已穿透所有题库目录，正在对全系统多媒体资源进行引用核查。
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={checkStorageReferences}
                        disabled={scanLoading}
                        className="px-6 py-3 bg-white text-purple-700 font-bold rounded-2xl hover:bg-purple-50 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                    >
                        <FiRefreshCw className={scanLoading ? 'animate-spin' : ''} /> 
                        {scanLoading ? '清查中...' : '启动全局巡检'}
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
                    <div className="flex flex-col">
                        <span className="text-xs text-purple-200 uppercase tracking-wider font-bold">资源总量</span>
                        <span className="text-xl font-black">{stats.totalFiles} <span className="text-sm font-normal opacity-60">Items</span></span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-purple-200 uppercase tracking-wider font-bold">存储占用</span>
                        <span className="text-xl font-black">{(stats.totalSize / (1024 * 1024)).toFixed(2)} <span className="text-sm font-normal opacity-60">MB</span></span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-purple-200 uppercase tracking-wider font-bold">冗余提示</span>
                        <span className="text-xl font-black text-rose-300">{unusedImages.length} <span className="text-sm font-normal opacity-60">Unused</span></span>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="relative group">
                <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-purple-500 transition-colors" />
                <input
                    type="text"
                    placeholder="在全局冗余结果中搜索文件名..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-purple-500/50 rounded-2xl shadow-sm outline-none transition-all dark:text-white"
                />
            </div>

            {/* Results */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden min-h-[400px]">
                {scanLoading ? (
                    <div className="h-96 flex flex-col items-center justify-center gap-4 text-gray-500">
                        <div className="relative">
                            <FiDatabase className="w-16 h-16 text-purple-500/20" />
                            <FiLoader className="absolute inset-0 w-16 h-16 animate-spin text-purple-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">深度递归清查中</p>
                            <p className="text-sm opacity-60">正在核对全量云端文件路径与本地数据条目...</p>
                        </div>
                    </div>
                ) : filteredImages.length > 0 ? (
                    <div className="p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {filteredImages.map((file) => (
                                <div key={file.fullPath} className="group flex flex-col bg-gray-50 dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                                    <div className="aspect-[16/10] relative overflow-hidden bg-gray-200 dark:bg-gray-700">
                                        <img 
                                            src={file.publicUrl} 
                                            alt={file.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button 
                                                onClick={() => handleDeleteStorageFile(file)}
                                                className="p-4 bg-white text-red-600 rounded-2xl shadow-xl hover:bg-red-50 active:scale-90 transition-all"
                                                title="物理删除"
                                            >
                                                <FiTrash2 className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <div className="text-xs font-mono text-gray-400 mb-1 truncate" title={file.fullPath}>
                                            /{file.fullPath.split('/').slice(0, -1).join('/')}
                                        </div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-white truncate" title={file.name}>
                                            {file.name}
                                        </div>
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                                                {(file.metadata?.size / 1024).toFixed(1)} KB
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(file.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-96 flex flex-col items-center justify-center gap-5 text-gray-400">
                        <div className="w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center animate-bounce duration-[2000ms]">
                            <FiCheck className="w-12 h-12 text-green-500" />
                        </div>
                        <div className="text-center px-8">
                            <p className="text-2xl font-black text-gray-900 dark:text-white">系统极度整洁</p>
                            <p className="text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                                全球清查完成！目前云端存储中的所有资源在题库中均有明确引用，未发现冗余文件。
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
