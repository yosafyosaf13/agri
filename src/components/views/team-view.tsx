'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { api, ApiError, type AuthUser } from '@/lib/api'
import { USER_ROLES, USER_ROLE_LIST, TEAM_TYPES, TEAM_TYPE_LIST, SPECIALTIES } from '@/lib/user-roles'
import { Users, Plus, Trash2, Pencil, UserCog, Shield, Phone } from 'lucide-react'

interface UserRow {
  id: number
  username: string
  fullName: string
  role: string
  phone: string | null
  specialty: string | null
  teamId: number | null
  active: boolean
  teamName: string | null
  teamType: string | null
  createdAt: string
}

interface TeamRow {
  id: number
  name: string
  type: string
  leaderId: number | null
  leaderName: string | null
  memberCount: number
  createdAt: string
}

export function TeamView({ user }: { user: AuthUser }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [userFormOpen, setUserFormOpen] = useState(false)
  const [teamFormOpen, setTeamFormOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const isAdmin = user.role === 'admin'

  const [formData, setFormData] = useState({
    username: '', password: '', fullName: '', role: 'engineer',
    phone: '', specialty: '', teamId: '',
  })

  const [teamData, setTeamData] = useState({
    name: '', type: 'pest_control', leaderId: '',
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [u, t] = await Promise.all([
        api.get<{ users: UserRow[] }>('/api/users'),
        api.get<{ teams: TeamRow[] }>('/api/teams'),
      ])
      setUsers(u.users)
      setTeams(t.teams)
    } catch (err) {
      toast({ title: '⚠️ خطأ', description: 'تعذّر تحميل البيانات', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { refresh() }, [refresh])

  function openAddUser() {
    setEditUser(null)
    setFormData({ username: '', password: '', fullName: '', role: 'engineer', phone: '', specialty: '', teamId: '' })
    setUserFormOpen(true)
  }

  function openEditUser(u: UserRow) {
    setEditUser(u)
    setFormData({ username: u.username, password: '', fullName: u.fullName, role: u.role, phone: u.phone || '', specialty: u.specialty || '', teamId: u.teamId ? String(u.teamId) : '' })
    setUserFormOpen(true)
  }

  async function submitUser(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload: any = {
        fullName: formData.fullName,
        role: formData.role,
        phone: formData.phone || null,
        specialty: formData.specialty || null,
        teamId: formData.teamId ? Number(formData.teamId) : null,
      }
      if (formData.password) payload.password = formData.password
      if (editUser) {
        await api.put(`/api/users/${editUser.id}`, payload)
        toast({ title: '✅ تم تحديث المستخدم' })
      } else {
        payload.username = formData.username
        payload.password = formData.password
        await api.post('/api/users', payload)
        toast({ title: '✅ تم إنشاء المستخدم' })
      }
      setUserFormOpen(false)
      await refresh()
    } catch (err) {
      toast({ title: '⚠️ خطأ', description: err instanceof ApiError ? err.message : 'فشل', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(u: UserRow) {
    try {
      await api.put(`/api/users/${u.id}`, { active: !u.active })
      toast({ title: u.active ? '⏸️ تم تعطيل الحساب' : '▶️ تم تفعيل الحساب' })
      await refresh()
    } catch (err) {
      toast({ title: '⚠️ خطأ', variant: 'destructive' })
    }
  }

  async function deleteUserConfirm() {
    if (!deleteUser) return
    setSubmitting(true)
    try {
      await api.del(`/api/users/${deleteUser.id}`)
      toast({ title: '✅ تم حذف المستخدم' })
      setDeleteUser(null)
      await refresh()
    } catch (err) {
      toast({ title: '⚠️ خطأ', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function submitTeam(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/api/teams', {
        name: teamData.name,
        type: teamData.type,
        leaderId: teamData.leaderId ? Number(teamData.leaderId) : null,
      })
      toast({ title: '✅ تم إنشاء الفريق' })
      setTeamFormOpen(false)
      setTeamData({ name: '', type: 'pest_control', leaderId: '' })
      await refresh()
    } catch (err) {
      toast({ title: '⚠️ خطأ', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-20">
        <Shield className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-lg font-bold text-gray-600">هذه الصفحة للمسؤولين فقط</h2>
        <p className="text-sm text-gray-400 mt-1">تواصل مع مدير النظام لإضافة مستخدمين</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 fade-in-up max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-[#4a7c59]" />
          <h2 className="text-xl sm:text-2xl font-bold text-[#1f3a26]">إدارة الفريق</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setTeamFormOpen(true)} className="h-9">
            <Plus className="size-4" /> فريق جديد
          </Button>
          <Button size="sm" onClick={openAddUser} className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white h-9">
            <UserCog className="size-4" /> مستخدم جديد
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {USER_ROLE_LIST.map(r => {
          const count = users.filter(u => u.role === r.value).length
          return (
            <Card key={r.value} className="p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-[#1f3a26]">{count}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">{r.label}</div>
            </Card>
          )
        })}
      </div>

      {/* Teams section */}
      {teams.length > 0 && (
        <Card className="p-4 sm:p-5 gap-0 shadow-sm">
          <h3 className="font-bold text-[#1f3a26] border-b pb-2 mb-3">👥 الفرق ({teams.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teams.map(t => (
              <div key={t.id} className="rounded-lg border p-3 bg-gradient-to-bl from-emerald-50/50 to-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[#1f3a26]">{t.name}</span>
                  <Badge className="text-[10px] bg-emerald-100 text-emerald-700">
                    {TEAM_TYPES[t.type as keyof typeof TEAM_TYPES] || t.type}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600">
                  {t.leaderName ? `🎯 قائد: ${t.leaderName}` : 'لا قائد'}
                  {' · '}
                  {t.memberCount} عضو
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Users table */}
      <Card className="overflow-hidden shadow-sm">
        <div className="px-4 sm:px-5 py-3 border-b bg-[#1f3a26] text-white">
          <h3 className="text-base font-bold">👤 المستخدمون ({users.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">المستخدم</TableHead>
                <TableHead className="text-right">الدور</TableHead>
                <TableHead className="text-right">التخصص</TableHead>
                <TableHead className="text-right">الفريق</TableHead>
                <TableHead className="text-right">الهاتف</TableHead>
                <TableHead className="text-right">نشط</TableHead>
                <TableHead className="text-right">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id} className={u.active ? '' : 'opacity-50'}>
                  <TableCell className="font-bold text-[#1f3a26]">{u.fullName}</TableCell>
                  <TableCell className="text-xs text-gray-600">{u.username}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${
                      u.role === 'admin' ? 'bg-amber-100 text-amber-700' :
                      u.role === 'engineer' ? 'bg-emerald-100 text-emerald-700' :
                      u.role === 'supervisor' ? 'bg-blue-100 text-blue-700' :
                      u.role === 'team_lead' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {USER_ROLES[u.role as keyof typeof USER_ROLES] || u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">{u.specialty || '—'}</TableCell>
                  <TableCell className="text-xs text-gray-600">
                    {u.teamName ? (
                      <span>{u.teamName}
                        {u.teamType && <span className="text-gray-400"> ({TEAM_TYPES[u.teamType as keyof typeof TEAM_TYPES]})</span>}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">
                    {u.phone ? <span className="flex items-center gap-1"><Phone className="size-3" />{u.phone}</span> : '—'}
                  </TableCell>
                  <TableCell>
                    <Switch checked={u.active} onCheckedChange={() => toggleActive(u)} disabled={u.role === 'admin'} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEditUser(u)} className="h-7 w-7 p-0">
                        <Pencil className="size-3.5" />
                      </Button>
                      {u.role !== 'admin' && (
                        <Button size="sm" variant="ghost" onClick={() => setDeleteUser(u)} className="h-7 w-7 p-0 text-red-600">
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* User form dialog */}
      <Dialog open={userFormOpen} onOpenChange={setUserFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitUser} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">الاسم الكامل *</Label>
                <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">اسم المستخدم {!editUser && '*'}</Label>
                <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={!!editUser} className="h-9 text-sm" required={!editUser} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{editUser ? 'كلمة سر جديدة (اتركها فارغة للإبقاء)' : 'كلمة السر *'}</Label>
              <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="h-9 text-sm" required={!editUser} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">الدور</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {USER_ROLE_LIST.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">التخصص</Label>
                <Select value={formData.specialty || ''} onValueChange={v => setFormData({...formData, specialty: v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">الهاتف</Label>
                <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="01xxxxxxxxx" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الفريق</Label>
                <Select value={formData.teamId} onValueChange={v => setFormData({...formData, teamId: v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {teams.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setUserFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={submitting} className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white">
                {submitting ? '⏳...' : '💾 حفظ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Team form dialog */}
      <Dialog open={teamFormOpen} onOpenChange={setTeamFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>إنشاء فريق جديد</DialogTitle></DialogHeader>
          <form onSubmit={submitTeam} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">اسم الفريق *</Label>
              <Input value={teamData.name} onChange={e => setTeamData({...teamData, name: e.target.value})} required placeholder="مثال: فريق المكافحة الشمالي" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نوع الفريق *</Label>
              <Select value={teamData.type} onValueChange={v => setTeamData({...teamData, type: v})}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEAM_TYPE_LIST.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">قائد الفريق (اختياري)</Label>
              <Select value={teamData.leaderId} onValueChange={v => setTeamData({...teamData, leaderId: v})}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.role !== 'admin').map(u => <SelectItem key={u.id} value={String(u.id)}>{u.fullName} ({u.username})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setTeamFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={submitting} className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white">
                {submitting ? '⏳...' : '💾 حفظ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{deleteUser?.fullName}"؟ لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUserConfirm} className="bg-red-600 hover:bg-red-700">
              {submitting ? '⏳...' : '🗑️ حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
