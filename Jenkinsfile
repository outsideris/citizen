/**
 * This Jenkinsfile uses components of our internal Jenkins library
 */
@Library('visenze-lib') import com.visenze.jenkins.Helm

pipeline {
  agent {
    label 'pod'
  }

  environment {
    CITIZEN_DB_DIR = './data'
    CITIZEN_STORAGE = 'file'
    CITIZEN_STORAGE_PATH = '/tmp/citizen'
    CITIZEN_ADDR = 'http://localhost:3000'
    CITIZEN_MOCK_ENABLED = true
    CITIZEN_AWS_S3_BUCKET = 'citizen.fake.bucket'
    AWS_ACCESS_KEY_ID = 'notanaccesskey'
    AWS_SECRET_ACCESS_KEY = 'notasecretkey'
    DEBUG = '*,-mocha:*,-express:*,-nock.*,-pouchdb:*,-eslint:*,-eslint*,-snapdragon:*,-body-parser:*,-morgan,-superagent'
  }

  stages {
    stage('Checks') {
      parallel {
        stage('Lint') {
          agent {
            label 'pod'
          }

          steps {
            sh 'npm install'
            sh 'npm run lint'
          }
        }

        stage('Test') {
          agent {
            label 'pod'
          }

          steps {
            sh 'npm install'
            sh 'npm test -- --forbid-only'
          }
        }
      }
    }

    stage('Artifacts') {
      parallel {
        stage('Docker') {
          agent {
            label 'build'
          }

          steps {
            sh 'docker build -t citizen .'
          }
        }

        stage('Helm') {
          agent {
            label 'pod'
          }

          when {
            beforeAgent true
            branch 'master'
          }

          steps {
            script {
              def c = new Helm(this).initialize()
              c.upload('helm/citizen')
            }
          }
        }

        stage('Terraform') {
          agent {
            label 'pod'
          }

          when {
            beforeAgent true
            branch 'master'
          }

          steps {
            echo 'Uploading Terraform module'
          }
        }
      }
    }
  }
}
