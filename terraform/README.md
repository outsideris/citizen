# Terraform for Citizen

Contains the Terraform code required to do storage for Citizen

## Resources created and credentials required

In order for this terraform module to work, it needs the following

- AWS Account with the following permissions
  - Create IAM User
  - Create IAM Policy
  - Attach IAM Policy to User
  - Create S3 bucket

## Variables

| Name     | Description                                            |
| -------- | ------------------------------------------------------ |
| `prefix` | A prefix added to every name of every resource created |
