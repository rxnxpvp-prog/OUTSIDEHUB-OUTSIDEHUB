# Deploy AWS

Este projeto esta pronto para deploy automatico no AWS Elastic Beanstalk usando GitHub Actions.

## Como funciona

- Todo push na branch `main` dispara `.github/workflows/deploy-aws-elastic-beanstalk.yml`.
- O workflow autentica na AWS via OIDC (`AWS_ROLE_TO_ASSUME`).
- O Elastic Beanstalk cria/atualiza o app `outsidehub` e o ambiente `outsidehub-prod`.
- A plataforma usada e Docker em Amazon Linux 2023.

## Preparar AWS uma vez

1. No IAM, crie o Identity Provider do GitHub:
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`

2. Crie uma role IAM para o GitHub Actions assumir.
   - Trust policy deve liberar este repo:
     `repo:rxnxpvp-prog/OUTSIDEHUB-OUTSIDEHUB:*`
   - Salve o ARN da role.

3. Anexe permissoes para deploy no Elastic Beanstalk.
   - Caminho simples: policy AWS gerenciada `AdministratorAccess-AWSElasticBeanstalk`.
   - Tambem precisa permitir S3 no bucket de artifact do Beanstalk, normalmente:
     `elasticbeanstalk-us-east-1-ACCOUNT_ID`

4. Garanta que estas roles padrao do Elastic Beanstalk existam:
   - `aws-elasticbeanstalk-ec2-role`
   - `aws-elasticbeanstalk-service-role`

5. No GitHub, adicione o secret:
   - Repository Settings -> Secrets and variables -> Actions -> New repository secret
   - Nome: `AWS_ROLE_TO_ASSUME`
   - Valor: ARN da role criada no IAM

## Variaveis importantes

No workflow, ajuste se quiser outro nome/regiao:

```yaml
AWS_REGION: us-east-1
APPLICATION_NAME: outsidehub
ENVIRONMENT_NAME: outsidehub-prod
```

## Banco local

Hoje o app usa JSON em `DATA_DIR` (`/app/data` no container). Isso serve para subir rapido, mas nao e o ideal para dados permanentes em producao: redeploy/rebuild pode perder dados dependendo do ambiente. Para producao real, migre para RDS, DynamoDB ou EFS.

## Deploy manual pelo GitHub

Depois de configurar o secret, abra:

`Actions -> Deploy AWS Elastic Beanstalk -> Run workflow`

Depois disso, cada push na `main` faz deploy automatico.
