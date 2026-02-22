'use client'

import { useState } from 'react'
import { FiUsers, FiDatabase, FiLayers } from 'react-icons/fi'

import OrgManager from './OrgManager'
import UserManager from './UserManager'
import BankManager from './BankManager'

export default function AdminTabs() {
    const [activeTab, setActiveTab] = useState('orgs')

    const tabs = [
        { id: 'orgs', name: '组织管理', icon: FiLayers },
        { id: 'users', name: '用户管理', icon: FiUsers },
        { id: 'banks', name: '题库管理', icon: FiDatabase },
    ]

    return (
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden mt-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex -mb-px" aria-label="Tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm sm:text-base transition-colors flex items-center justify-center relative
                  ${isActive
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'}
                `}
                            >
                                <Icon className={`mr-2 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                                {tab.name}
                            </button>
                        )
                    })}
                </nav>
            </div>

            <div className="p-6">
                <div className={`transition-opacity duration-300 ${activeTab === 'orgs' ? 'block animate-in fade-in' : 'hidden'}`}>
                    <OrgManager />
                </div>
                <div className={`transition-opacity duration-300 ${activeTab === 'users' ? 'block animate-in fade-in' : 'hidden'}`}>
                    <UserManager />
                </div>
                <div className={`transition-opacity duration-300 ${activeTab === 'banks' ? 'block animate-in fade-in' : 'hidden'}`}>
                    <BankManager />
                </div>
            </div>
        </div>
    )
}
