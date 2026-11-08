import { withPerfRequest } from '@/lib/slightnudge/perf-stages';
import { NextResponse } from 'next/server';
import { validateMutatingRequest } from '@/lib/slightnudge/auth';
import { corsHeaders, handleCorsPreflight } from '@/lib/slightnudge/cors';
import { resolveRepositoryRoot, resolveRepositorySourcePath, resolveWorkspaceSourcePath } from '@/lib/slightnudge/repository-store';
import { saveSourceGroup, sourceGroupStatus, undoSourceGroup } from '@/lib/slightnudge/source-group';
import { validGroupId } from '@/lib/slightnudge/source-group-journal';
export async function OPTIONS(request: Request) { return handleCorsPreflight(request) || new NextResponse(null, { status: 204 }); }
async function measuredPost(request: Request) {
    const auth = validateMutatingRequest(request);
    if (!auth.valid)
        return auth.response;
    const headers = { ...corsHeaders(request), 'Cache-Control': 'no-store' };
    try {
        const body = await request.json();
        if (!validGroupId(body.transactionId) || !['save', 'status', 'undo'].includes(body.operation) || body.repositoryId !== undefined && typeof body.repositoryId !== 'string')
            throw new Error('Choose a valid change set and operation.');
        const repositoryId = body.repositoryId as string | undefined;
        const scope = { repositoryId, root: repositoryId ? await resolveRepositoryRoot(repositoryId) : process.cwd() };
        let result;
        if (body.operation === 'status')
            result = sourceGroupStatus(body.transactionId, scope);
        else if (body.operation === 'undo')
            result = undoSourceGroup(body.transactionId, scope);
        else {
            if (!Array.isArray(body.members) || !body.members.length || body.members.length > 16)
                throw new Error('Choose 1–16 draft files.');
            const members = [];
            for (const member of body.members) {
                if (!validGroupId(member?.previewId) || typeof member.filePath !== 'string' || member.filePath.length > 1000)
                    throw new Error('A change-set member is invalid.');
                const filePath = repositoryId ? (await resolveRepositorySourcePath(repositoryId, member.filePath)).filePath : resolveWorkspaceSourcePath(member.filePath);
                members.push({ previewId: member.previewId, filePath, sourcePath: repositoryId ? member.filePath : undefined });
            }
            result = await saveSourceGroup(body.transactionId, members, scope);
        }
        return NextResponse.json(result, { status: result.success ? 200 : 409, headers });
    }
    catch (error) {
        return NextResponse.json({ success: false, code: 'GROUP_REQUEST_REFUSED', error: error instanceof Error ? error.message : 'The change set could not be checked.' }, { status: 400, headers });
    }
}

export const POST = withPerfRequest(measuredPost);
