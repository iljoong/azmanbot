# Azure Management Bot (AzmanBot)

[English](./README.md)

## Overview

본 샘플 앱은 Azure 백앤드 서비스를 관리(VM 정지 또는 시작 등)하는 챗봇 서비스 구현 방법을 소개합니다.
챗봇 서비스는 Azure 포탈에 로그인 없이 편리하게 여러가지 관리를 할 수 있습니다. VM 정지/시작을 스케쥴링하는 기능도 포함되어 있습니다.
Azure 관리 기능에 추가적으로, [LUIS](https://www.luis.ai)가 통합되어 자연어 이해하는 관리 커맨드를 사용할 수 있습니다.

> **주의**: 본 샘플 앱은 Azure 구독 정보(보안 키 포함)가 호스팅되는 API 앱에 저장되기 때문에 프라이빗 봇 서비스로 사용하는 것을 권장합니다.

## APIs

AzmanBot은 Microsoft의 Botframework를 활용한 챗봇 서비스입니다. 이 봇 서비스는 2개의 API 앱(Bot API, Usage API)으로 구성되어 있습니다.

기본 Bot API는 자연어 처리를 지원하지 않고 CLI (Command Line Interface) 스타일 채팅만 지원합니다. 자연어 처리 기능 사용을 원한다면 LUIS가 적용된 Bot API를 사용하십시오.

### Bot API

기본 챗봇 API 입니다. CLI 스타일 챗만 이해합니다. 예를 들어, VM을 매주 오전 8:55에 시작(시작 날짜로 부터)하고자 한다면 다음과 같은 커맨드를 실행합니다.
`sch start azurevm 8:55am week`

> **노트**: 시간을 입력할 때 am/pm은 스페이스 없이 시간에 표기해야 합니다. 즉, `8:55am`은 올바르지만 `8:55 am` 올바르지 않음


[botapi cli/master branch](https://github.com/iljoong/azmanbot/tree/cli/botapi)

_클릭하여 데모 확인_

[![Watch Demo](https://img.youtube.com/vi/2dUxRE5sy0E/0.jpg)](https://youtu.be/2dUxRE5sy0E)

### Bot API (LUIS)

[LUIS](https://www.luis.ai)가 적용된 챗봇 API 입니다. 자연어 챗을 이해합니다. 예를 들어, VM을 매주 오전 8:55에 시작(시작 날짜로 부터)하고자 한다면 다음과 같은 커맨드를 실행합니다.
`set schedule to start (azurevm) at 8:55 am on every monday`

> **노트**: LUIS 버전 챗봇은 다양한 날짜/시간 형식을 이해함

[botapi luis branch](https://github.com/iljoong/azmanbot/tree/luis/botapi)

_클릭하여 데모 확인_

[![Watch Demo](https://img.youtube.com/vi/pgbrDQFqMDc/0.jpg)](https://youtu.be/pgbrDQFqMDc)

### Usage API

Azure 구독의 빌링/사용량을 확인하는 API 입니다. 이 API는 복잡한 데이터 쿼리를 LINQ를 이용하여 처리할 수 있기 때문에  C#/.NET Core로 작성되었습니다. 

[usageapi](./usageapi)

## Architecture

![Azmanbot Architecture](./asset/azmanbot_arch.png)

## Features

* __기본 챗서비스 및 Skype & Slack 채널 지원__

    * node.js 기반
    * Basic/Prompt/Waterfall 대화
    * CLI 스타일 챗

* __Azure service 관리__

    * OAuth의 client credential 이용한 Access token 획득 (AAD 구성 필요)
    * Azure Service Management API 호출 (VM 리스트, VM 상태, VM 정지/시작, 사용량)
    * Azure Billing API 호출 (별도 .net core 기반 API App 구성)
    * LINQ를 이용한 사용량 계산 및 표기 (날짜 또는 미터링 SKU)

* __스케쥴링__

    * VM start/stop VM 스케쥴링 설정
    * 일일 또는 주간 스케쥴링 설정

* __다중 사용자 지원__

    * 사용자 등록 페이지
    * 사용자 정보 저장(subscription and etc.)

* __서버 트리거 메시지__

    * 서버로부터 사용자에게 메시지 전달 

* __LUIS를 이용한 자연어 처리__


