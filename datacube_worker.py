# -*- coding: utf-8 -*-
"""
Created on Wed Jul  1 16:12:04 2015

@author: datacube
"""
from __future__ import absolute_import
import sys
sys.path.insert(0,'/tilestore/')
from celery import Celery
import redis
import psycopg2

celery = Celery(include=['dc_tasks'])
celery.config_from_object('celeryconfig')


cache = redis.StrictRedis(host='localhost',port=6379,db=1) #implement our own custom cache
database = None
try:
    database = psycopg2.connect(host='127.0.0.1',port='5432',dbname='postgres',user='cube_user',password='GAcube0')
except:
    print "Cannot connect to datacube database. Please check settings"
    exit()

if __name__ == '__main__':
    celery.start()
    
