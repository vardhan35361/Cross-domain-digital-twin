pipeline {
    agent any

    environment {
        PYTHON = 'C:\\Users\\admin\\AppData\\Local\\Programs\\Python\\Python312\\python.exe'
        NPM = 'C:\\Program Files\\nodejs\\npm.cmd'
        DOCKER = 'C:\\Users\\admin\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'
        COMPOSE = 'C:\\Users\\admin\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker-compose.exe'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out project from GitHub'
            }
        }

        stage('Environment Check') {
            steps {
                bat '''
                    "%PYTHON%" --version
                    "%NPM%" --version
                    "%DOCKER%" --version
                    "%COMPOSE%" version
                '''
            }
        }

        stage('Install Python Dependencies') {
            steps {
                bat '''
                    "%PYTHON%" -m pip install -r backend\\requirements.txt
                '''
            }
        }

        stage('Frontend Install') {
            steps {
                bat '''
                    cd frontend
                    "%NPM%" install --legacy-peer-deps
                '''
            }
        }

        stage('Frontend Build') {
            steps {
                bat '''
                    cd frontend
                    "%NPM%" run build
                '''
            }
        }

        stage('Python Validation') {
            steps {
                bat '''
                    "%PYTHON%" -m py_compile backend\\server.py
                    "%PYTHON%" -m compileall -q backend
                '''
            }
        }

        stage('Docker Compose Validation') {
            steps {
                bat '''
                    "%COMPOSE%" config
                '''
            }
        }

        stage('Docker Build') {
            steps {
                bat '''
                    "%COMPOSE%" build
                '''
            }
        }

        stage('Deploy') {
            steps {
                bat '''
                    "%COMPOSE%" up -d
                '''
            }
        }

        stage('Deployment Check') {
            steps {
                bat '''
                    "%DOCKER%" ps
                '''
            }
        }
    }

    post {
        success {
            echo '========================================'
            echo 'JENKINS CI/CD PIPELINE SUCCESSFUL'
            echo '========================================'
        }

        failure {
            echo 'Jenkins pipeline failed. Check the stage above.'
        }
    }
}
