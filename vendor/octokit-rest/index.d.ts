export interface OctokitOptions {
  auth?: string;
}

export interface CreateCommentParams {
  owner: string;
  repo: string;
  issue_number: number;
  body: string;
}

export declare class Octokit {
  constructor(options?: OctokitOptions);
  issues: {
    createComment(params: CreateCommentParams): Promise<unknown>;
  };
}
