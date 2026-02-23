# AWS IAM Role Setup for GitHub Actions Deployment

This guide walks you through creating the necessary AWS resources for GitHub Actions to deploy to EC2 instances via SSM and S3.

## Prerequisites

- AWS Account with administrative access
- GitHub repository for your project
- AWS Console access

## Step 1: Create GitHub OIDC Identity Provider

First, set up the GitHub OIDC identity provider to allow GitHub Actions to authenticate with AWS:

1. **Navigate to IAM Console**
   - Go to AWS Console → IAM → Identity providers
   - Click `Add provider`

2. **Configure Identity Provider**
   - Provider type: Select `OpenID Connect`
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
   - Click `Get thumbprint` (it will auto-populate)
   - Click `Add provider`

## Step 2: Create Custom IAM Policies

Before creating the role, you need to create two custom policies:

### Policy 1: S3DeploymentPolicy

1. Go to IAM → Policies → Create policy
2. Choose JSON tab and paste:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:GetObjectAcl",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::temp-deploy-hennie-francis-tech-bucket/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::temp-deploy-hennie-francis-tech-bucket"
            ]
        }
    ]
}
```
3. Name: `S3Deployment`
4. Description: `Policy for GitHub Actions to upload deployment artifacts to S3`
5. Click `Create policy`

###  Policy 2: EC2SSM
1. Create another policy with this JSON:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ssm:SendCommand",
                "ssm:ListCommandInvocations",
                "ssm:DescribeInstanceInformation",
                "ssm:GetCommandInvocation",
                "ssm:ListCommands"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeInstanceStatus"
            ],
            "Resource": "*"
        }
    ]
}
```
2. Name: `EC2SSM`
3. Description: `Policy for GitHub Actions to interact with EC2 and SSM`
4. Click `Create policy`

## Step 3 Create the EC2SSM IAM Role
1. **Navigate to Roles**
   - Go to IAM → Roles
   - Click `Create role`
   - Select Trusted Entity

2. **Choose "Web identity"**
   - Identity provider: Select `token.actions.githubusercontent.com`
   - Audience: Select `sts.amazonaws.com`
   - GitHub organization: Enter your GitHub username
   - GitHub repository: Enter your repository name
   - GitHub branch: Enter `main` (or your default branch)
   - Click `Next`

3. **Add Permissions**
   - Search for and select `S3Deployment`
   - Search for and select `EC2SSM`
   - Click `Next`

4. **Name and Create Role**
   - Role name: `EC2SSM`
   - Description: `Role for GitHub Actions to deploy to EC2 via SSM`
   - Click `Create role`

## Step 4: Create S3 Bucket
1. **Navigate to S3**
   - Go to AWS Console → S3
   - Click `Create bucket`

2. **Configure Bucket**
   - Bucket name: `temp-deploy-hennie-francis-tech-bucket`
   - Region: `af-south-1` (Africa Cape Town)
   - Keep `Block all public access` checked
   - Enable versioning
   - Enable default encryption (AES-256)
   - Click `Create bucket`

## Step 5: Update Trust Policy (Recommended)
For more flexibility and security, manually edit the trust policy:

1. Go to the `EC2SSM` role
2. Click `Trust relationships` tab
3. Click `Edit trust policy`
4. Replace with this policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRole",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                },
                "StringLike": {
                    "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/YOUR_REPO_NAME:*"
                }
            }
        }
    ]
}
```

**Important: Replace the following placeholders:**
   - `YOUR_ACCOUNT_ID` with your actual AWS account ID (e.g., 511489843375)
   - `YOUR_GITHUB_USERNAME/YOUR_REPO_NAME` with your actual GitHub username and repository name

## Step 6: Get the Role ARN
After creating the role:

1. Go to IAM → Roles → EC2SSM
2. Copy the Role ARN from the Summary section
3. It should look like: `arn:aws:iam::YOUR_ACCOUNT_ID:role/EC2SSM`