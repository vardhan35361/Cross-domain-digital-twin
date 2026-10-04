pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        COMPOSE_PROJECT_NAME = 'hyderabad-digital-twin'
        API_URL = 'http://localhost:8001'

        PYTHON = 'C:\\Users\\admin\\AppData\\Local\\Programs\\Python\\Python312\\python.exe'
        DOCKER = 'C:\\Users\\admin\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'
        COMPOSE = 'C:\\Users\\admin\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker-compose.exe'
        NODE = 'C:\\Program Files\\nodejs\\node.exe'
        NPM = 'C:\\Program Files\\nodejs\\npm.cmd'
    }

    stages {

        stage('Environment Check') {
            steps {
                bat '''
                    echo ==============================
                    echo ENVIRONMENT CHECK
                    echo ==============================

                    "%PYTHON%" --version
                    if errorlevel 1 exit /b 1

                    "%DOCKER%" --version
                    if errorlevel 1 exit /b 1

                    "%COMPOSE%" version
                    if errorlevel 1 exit /b 1

                    "%NODE%" --version
                    if errorlevel 1 exit /b 1

                    "%NPM%" --version
                    if errorlevel 1 exit /b 1

                    echo ==============================
                    echo ENVIRONMENT OK
                    echo ==============================
                '''
            }
        }

        stage('Install Dependencies') {
            parallel {

                stage('Python') {
                    steps {
                        bat '''
                            "%PYTHON%" -m pip install -r backend\\requirements.txt
                            if errorlevel 1 exit /b 1
                        '''
                    }
                }

                stage('Node') {
                    steps {
                        bat '''
                            cd frontend
                            "%NPM%" install --legacy-peer-deps
                            if errorlevel 1 exit /b 1
                        '''
                    }
                }
            }
        }

        stage('Static Analysis') {
            parallel {

                stage('Python lint') {
                    steps {
                        bat '''
                            "%PYTHON%" -m py_compile backend\\server.py backend\\twins.py backend\\auth.py
                            if errorlevel 1 exit /b 1
                        '''
                    }
                }

                stage('Python compileall') {
                    steps {
                        bat '''
                            "%PYTHON%" -m compileall -q backend
                            if errorlevel 1 exit /b 1
                        '''
                    }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                bat '''
                    "%PYTHON%" -m pytest -q tests
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Domain Simulation Tests') {
            steps {
                bat '''
                    "%PYTHON%" backend\\tests\\domain_simulation_test.py
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Operator Action Tests') {
            steps {
                bat '''
                    "%PYTHON%" backend\\tests\\operator_action_test.py
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('WebSocket + Replay Tests') {
            steps {
                bat '''
                    "%PYTHON%" backend\\tests\\websocket_replay_test.py
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Frontend Build') {
            steps {
                bat '''
                    cd frontend
                    "%NPM%" run build
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Docker Compose Validation') {
            steps {
                bat '''
                    "%COMPOSE%" config -q
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Docker Build') {
            parallel {

                stage('Backend image') {
                    steps {
                        bat '''
                            "%DOCKER%" build -t hyd-twin-backend:%BUILD_NUMBER% backend
                            if errorlevel 1 exit /b 1
                        '''
                    }
                }

                stage('Frontend image') {
                    steps {
                        bat '''
                            "%DOCKER%" build -t hyd-twin-frontend:%BUILD_NUMBER% frontend
                            if errorlevel 1 exit /b 1
                        '''
                    }
                }
            }
        }

        stage('Deploy Stack') {
            steps {
                bat '''
                    "%COMPOSE%" up -d --build
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Wait for Health') {
            steps {
                bat '''
                    powershell -NoProfile -Command ^
                    "$ok=$false; for($i=0;$i -lt 30;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri '%API_URL%/api/health' -TimeoutSec 5; if($r.StatusCode -eq 200){$ok=$true; break} } catch {}; Start-Sleep -Seconds 3 }; if(-not $ok){exit 1}"

                    if errorlevel 1 exit /b 1

                    curl.exe -fsS %API_URL%/api/domains
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Cross-Domain Smoke Tests') {
            steps {
                bat '''
                    curl.exe -fsS %API_URL%/api/twins/traffic > NUL
                    if errorlevel 1 exit /b 1

                    curl.exe -fsS %API_URL%/api/twins/hospital > NUL
                    if errorlevel 1 exit /b 1

                    curl.exe -fsS %API_URL%/api/twins/building > NUL
                    if errorlevel 1 exit /b 1

                    curl.exe -fsS %API_URL%/api/twins/industrial > NUL
                    if errorlevel 1 exit /b 1

                    curl.exe -fsS %API_URL%/api/twins/energy > NUL
                    if errorlevel 1 exit /b 1

                    curl.exe -fsS %API_URL%/api/twins/water > NUL
                    if errorlevel 1 exit /b 1

                    curl.exe -fsS "%API_URL%/api/twins/hospital/history?minutes=1" > NUL
                    if errorlevel 1 exit /b 1

                    curl.exe -fsS "%API_URL%/api/twins/building/history?minutes=1" > NUL
                    if errorlevel 1 exit /b 1

                    curl.exe -fsS "%API_URL%/api/twins/industrial/history?minutes=1" > NUL
                    if errorlevel 1 exit /b 1

                    curl.exe -fsS "%API_URL%/api/twins/energy/history?minutes=1" > NUL
                    if errorlevel 1 exit /b 1

                    curl.exe -fsS "%API_URL%/api/twins/water/history?minutes=1" > NUL
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Grafana + Prometheus') {
            steps {
                bat '''
                    curl.exe -fsS http://localhost:9090/-/ready
                    if errorlevel 1 exit /b 1

                    curl.exe -fsS http://admin:hyderabad2026@localhost:3001/api/health
                    if errorlevel 1 exit /b 1

                    curl.exe -fsS "http://admin:hyderabad2026@localhost:3001/api/search?type=dash-db"
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Persistence / Restart') {
            steps {
                bat '''
                    "%COMPOSE%" restart backend
                    if errorlevel 1 exit /b 1

                    powershell -NoProfile -Command ^
                    "$ok=$false; for($i=0;$i-lt 20;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri '%API_URL%/api/health' -TimeoutSec 5; if($r.StatusCode -eq 200){$ok=$true; break} } catch {}; Start-Sleep -Seconds 3 }; if(-not $ok){exit 1}"

                    if errorlevel 1 exit /b 1

                    curl.exe -fsS %API_URL%/api/twins/hospital
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Post-Deploy Smoke') {
            steps {
                bat '''
                    curl.exe -fsS %API_URL%/api/overview > NUL
                    if errorlevel 1 exit /b 1

                    curl.exe -fsS %API_URL%/api/predictions > NUL
                    if errorlevel 1 exit /b 1

                    curl.exe -fsS %API_URL%/api/metrics
                    if errorlevel 1 exit /b 1
                '''
            }
        }
    }

    post {

        success {
            archiveArtifacts artifacts: 'frontend/build/**,backend/**/*.py',
                             allowEmptyArchive: true

            echo '=========================================='
            echo 'HYDERABAD DIGITAL TWIN CI/CD PASSED'
            echo '=========================================='
        }

        failure {
            bat '''
                "%COMPOSE%" logs --tail=200 || exit /b 0
            '''

            bat '''
                "%COMPOSE%" down || exit /b 0
            '''

            echo 'Pipeline failed - stack torn down'
        }

        always {
            junit allowEmptyResults: true,
                  testResults: 'test-results/*.xml'
        }
    }
}
