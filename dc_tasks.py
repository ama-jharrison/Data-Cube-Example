# -*- coding: utf-8 -*-
"""
Created on Wed Jun 24 14:01:33 2015

@author: jdh

Tile task system for celery
"""
from datacube.api.query import SortType

from datetime import datetime,timedelta
import logging
import os
import gdal
import numpy
import numexpr as ne
from datacube.api.model import DatasetType, Ls57Arg25Bands, Satellite, Ls8Arg25Bands
from datacube.api.utils import NDV, empty_array, get_dataset_metadata, get_dataset_data_with_pq, raster_create,get_dataset_data, PqaMask
from datacube.api.query import list_tiles
from datacube.api.model import DatasetType
from datacube.api.model import Ls57Arg25Bands, TciBands, NdviBands, EviBands
from datacube.api.query import list_tiles
from datacube.api.utils import get_mask_pqa, get_dataset_data_masked, OutputFormat
import time

import itertools
import random
import string
from gdalconst import *
from datacube_worker import celery, cache, database
import Image
#app = Celery('tasks',backend='redis://localhost',broker='amqp://')
satellites = {'ls7':Satellite.LS7,'ls8':Satellite.LS8}
FILE_EXT = {"png":".png","GTiff":".tif","VRT":".vrt","JPEG":".jpeg"}

@celery.task()
def get_tile_info(xa,ya,start,end,satellite,datasets,months=None):
    """
    Get Tile Info
    """
    tiles = list_tiles(x=xa,y=ya,acq_min=start,acq_max=end,satellites = satellite,dataset_types=datasets)
    data = "{\"request\":\"DONE\",\"tiles\":["
    data_arr = []
    for tile in tiles:
        
        if months:
            print tile.start_datetime.month
            if tile.start_datetime.month in months:
                data_arr.append()
        else:
            data_arr.append("{\"x\":"+str(tile.x)+",\"y\":"+str(tile.y)+",\"date\":\""+str(tile.start_datetime)+"\"}")
    data+=','.join(data_arr)+"]}"
    return data
    
@celery.task()
def get_tile_listing(xa,ya,start,end,satellite,datasets,months=None):
    """
    List tiles. Months will only show the requested months
    """
    tiles = list_tiles(x=xa,y=ya,acq_min=start,acq_max=end,satellites = satellite,dataset_types=datasets)
    data = "{\"request\":\"DONE\",\"tiles\":["
    data_arr = []
    for tile in tiles:
        if months:
            print tile.start_datetime.month
            if tile.start_datetime.month in months:
                data_arr.append("{\"x\":"+str(tile.x)+",\"y\":"+str(tile.y)+",\"date\":\""+str(tile.start_datetime)+"\"}")
        else:
            data_arr.append("{\"x\":"+str(tile.x)+",\"y\":"+str(tile.y)+",\"date\":\""+str(tile.start_datetime)+"\"}")
    data+=','.join(data_arr)+"]}"
    return data
    

@celery.task()
def obtain_cloudfree_mosaic(x,y,start,end, bands, satellite,iterations=0,xsize=4000,ysize=4000,file_format="GTiff",data_type=gdal.GDT_CInt16,months=None):
    StartDate = start
    EndDate = end
    print "starting cloudfree mosaic"    
    best_data = {}
    band_str = "+".join([band.name for band in bands])
    sat_str = "+".join([sat.name for sat in satellite])
    cache_id = [str(x),str(y),str(start),str(end),band_str,sat_str,str(xsize),str(ysize),file_format,str(iterations)]
    f_name = "_".join(cache_id)
    f_name = f_name.replace(" ","_")
    c_name = f_name
    cached_res = cache.get(c_name)
#    if cached_res:
 #       return str(cached_res)
    f_name = os.path.join("/tilestore/tile_cache",f_name)
    tiles = list_tiles(x=[x], y=[y],acq_min=StartDate,acq_max=EndDate,satellites=satellite,dataset_types=[DatasetType.ARG25,DatasetType.PQ25], sort=SortType.ASC)
    tile_metadata = None
    tile_count = 0
    tile_filled = False
    stats_file = open(f_name+'.csv','w+')

    for tile in tiles:
        if tile_filled:
           break
        if months:
            print tile.start_datetime.month
            if not tile.start_datetime.month in months:
                continue
        #print "merging on tile "+str(tile.x)+", "+str(tile.y)
        tile_count+=1
        dataset =  DatasetType.ARG25 in tile.datasets and tile.datasets[DatasetType.ARG25] or None
        if dataset is None:
            print "No dataset availible"
            tile_count-=1
            continue
        tile_metadata = get_dataset_metadata(dataset)
        if tile_metadata is None:
            print "NO METADATA"
            tile_count-=1
            continue
        pqa = DatasetType.PQ25 in tile.datasets and tile.datasets[DatasetType.PQ25] or None
        mask = None
        mask = get_mask_pqa(pqa,[PqaMask.PQ_MASK_CLEAR],mask=mask)
	
	if tile.dataset.find('LC8') >= 0:
            nbands = map(lambda x: Ls8Arg25Bands(x.value+1),bands)
	else:
            nbands = bands
        band_data = get_dataset_data_masked(dataset, mask=mask,bands=nbands)

	if tile.dataset.find('LC8') >= 0:
             band_data = dict(map(lambda (k,v): (Ls57Arg25Bands(k.value-1),v), band_data.iteritems()))

        swap_arr = None
        best = None
        for band in bands:
            if not band in best_data:
                #print "Adding "+band.name
                #print band_data[band]
                best_data[band]=band_data[band]
                best = numpy.array(best_data[band])
                swap_arr=numpy.in1d(best.ravel(),-999).reshape(best.shape)
            else:
                best = numpy.array(best_data[band])
               
                swap_arr=numpy.in1d(best.ravel(),-999).reshape(best.shape)
                b_data = numpy.array(band_data[band])
                best[swap_arr]=b_data[swap_arr]
                best_data[band]=numpy.copy(best)
                del b_data
        stats_file.write(str(tile.start_datetime.year)+','+str(tile.start_datetime.month)+','+str(len(best[swap_arr]))+"\n")
        del swap_arr
        del best
        if iterations > 0:
            if tile_count>iterations:
                print "Exiting after "+str(iterations)+" iterations"
                break
    numberOfBands=len(bands)

    if numberOfBands == 0:
       return "None"
    if bands[0] not in best_data:
       print "No data was merged for "+str(x)+", "+str(y)
       return "None"

    print "mosaic created"
    numberOfPixelsInXDirection=len(best_data[bands[0]])
    print numberOfPixelsInXDirection
    numberOfPixelsInYDirection=len(best_data[bands[0]][0])   
    print numberOfPixelsInYDirection
    pixels = numberOfPixelsInXDirection
    if numberOfPixelsInYDirection > numberOfPixelsInXDirection:
        pixels = numberOfPixelsInYDirection
    if tile_count <1:
        print "No tiles found for "+str(x)+", "+str(y)
        return "None"
    driver = gdal.GetDriverByName(file_format)
    if driver is None:
        print "No driver found for "+file_format
        return "None"
    #print f_name+'.tif'
    raster = driver.Create(f_name+'.tif', pixels, pixels, numberOfBands, data_type, options=["BIGTIFF=YES", "INTERLEAVE=BAND"])
    raster.SetGeoTransform(tile_metadata.transform)
    raster.SetProjection(tile_metadata.projection)
    index = 1
    stats_file.close()
    for band in bands:
        stack_band = raster.GetRasterBand(index)
        stack_band.SetNoDataValue(-999)
        stack_band.WriteArray(best_data[band])
        stack_band.ComputeStatistics(True)
        index+=1
        stack_band.FlushCache()
        del stack_band
    raster.FlushCache()
    del raster
    cache.set(c_name,f_name+".tif")
    return f_name+".tif"
    
    
@celery.task()
def assemble_mosaic(file_list):
    print "Assembling mosaic"
    print file_list
    
    fl = None
    try:
        if type(file_list) is list:
            
            fl = [f for f in file_list if f!="None"]
        else:
            fl = [file_list]
    except:
        fl = [file_list]
    if len(fl) <1:
        return "None"
    c_name = hashlib.sha512("_".join(fl)).hexdigest()[0:32]
    cmd = "gdalbuildvrt -hidenodata /tilestore/tile_cache/"+c_name+".vrt "+" ".join(fl)
    print cmd
    os.system(cmd)
    if not os.path.exists("/tilestore/tile_cache/"+c_name+".vrt"):
        return "None"
    res = "/tilestore/tile_cache/"+c_name+".vrt"
    ret_prod = []
    ret_prod.append(res)
    for fi in fl:
        ret_prod.append(fi)
    return ret_prod

@celery.task()
def get_bounds(input_file):
    in_file = None
    print input_file
    if isinstance(input_file,(str)):
        if input_file == "None":
            return "None"
        else:
            in_file = input_file
    else:
        in_file = input_file[0]
    ds = gdal.Open(in_file)
    cols = ds.RasterXSize
    rows = ds.RasterYSize
    gt = ds.GetGeoTransform()
    bb1 = originx = gt[0]
    bb4 = originy = gt[3]
    pixelWidth = gt[1]
    pixelHeight = gt[5]
    width = cols*pixelWidth
    height = rows*pixelHeight
    bb3 = originx+width
    bb2 = originy+height
    del ds
    return str(bb2)+","+str(bb1)+","+str(bb4)+","+str(bb3)

@celery.task()
def translate_files(file_list,file_format,output_scale,output_size,output_datatype,output_bands,additional_arguments=None):
    print file_list
    fl = None
    try:
        if type(file_list) is list:
            
            fl = [f for f in file_list if f!="None"]
        else:
            fl = [file_list]
    except:
        fl = [file_list]
    addy = ""
    b_arg= ""
    if output_bands is not None:
        b_arg = " ".join(["-b "+str(b) for b in output_bands])
    res = []
    if additional_arguments:
        addy = " "+" ".join(additional_arguments)
    for f in fl:
        print "Translating "+f
        ds = gdal.Open(f)
        rc = ds.RasterCount
        if output_bands is not None:
            if rc < len(output_bands):
                print "Less bands than requested!"
                b_arg = "-b 1"
        del ds
        out_scale = ""
        out_dt = ""
        out_size = ""
        b_l_arg = ""
        if output_scale is not None and b_arg != "-b 1":
            out_scale = " -scale "+output_scale
        if output_datatype is not None:
            out_dt = " -ot "+output_datatype
        if output_size is not None:
            out_size = " -outsize "+output_size
        if output_bands is not None and b_arg != "-b 1":
            b_l_arg = " "+b_arg
        b_tmp = ""
        if output_bands is not None:
            b_tmp = "_".join([str(b) for b in output_bands])
        c_arr = [f,str(file_format),str(output_scale),str(output_size),str(output_datatype),b_tmp,addy]
        c_name = "_".join(c_arr)
        c_name = hashlib.sha512(c_name).hexdigest()[0:32]
        tar_img = os.path.join("/tilestore/tile_cache/",c_name+FILE_EXT[file_format])
        tar_img_marked = os.path.join("/tilestore/tile_cache/",c_name+"_marked"+FILE_EXT[file_format])
        
        
        cmd = "gdal_translate -of "+file_format+out_dt+out_scale+out_size+b_l_arg+addy+" "+f+" "+tar_img
        print cmd
        os.system(cmd)
        if os.path.exists(tar_img):
            if file_format == "png" or file_format == "PNG":
                cmd = "convert -transparent \"#000000\" "+tar_img+" "+tar_img
                os.system(cmd);
                cmd = "convert "+tar_img+" -background red -alpha remove "+tar_img_marked
                os.system(cmd)
            res.append(tar_img)
            res.append(tar_img_marked)
    return res
    
@celery.task()
def apply_color_table_to_files(file_list,output_band,color_table):
    print file_list
    fl = None
    try:
        if type(file_list) is list:
            
            fl = [f for f in file_list if f!="None"]
        else:
            fl = [file_list]
    except:
        fl = [file_list]
    
    
    res = []
    
    for f in fl:
        print "Coloring "+f
        c_arr = [f,str(output_band),color_table]
        c_name = "_".join(c_arr)
        c_name = hashlib.sha512(c_name).hexdigest()[0:32]
        tar_img = os.path.join("/tilestore/tile_cache/",c_name+".tif")
        tmp_img = os.path.join("/tilestore/tile_cache/",c_name)
        cmd = "gdal_translate "+f+" "+tmp_img+"_"+str(output_band)+".tif"+" -b "+str(output_band)
        os.system(cmd)
        print "Applying color table"
        cmd = "gdaldem color-relief -of GTiff "+tmp_img+"_"+str(output_band)+".tif"+" "+color_table+" "+tar_img
        print cmd
        os.system(cmd)
        
        if os.path.exists(tar_img):
            #cmd = "convert -transparent \"#000000\" "+tar_img+" "+tar_img
            #os.system(cmd);            
            res.append(tar_img)
    return res

@celery.task()
def preview_cloudfree_mosaic(x,y,start,end, bands, satellite,iterations=0,xsize=2000,ysize=2000,file_format="GTiff",data_type=gdal.GDT_CInt16):
    def resize_array(arr,size):
       r = numpy.array(arr).astype(numpy.int16)
       i = Image.fromarray(r)
       i2 = i.resize(size,Image.NEAREST)
       r2 = numpy.array(i2)
       del i2
       del i
       del r
       return r2
    StartDate = start
    EndDate = end
    
    best_data = {}
    band_str = "+".join([band.name for band in bands])
    sat_str = "+".join([sat.name for sat in satellite])
    cache_id = ["preview",str(x),str(y),str(start),str(end),band_str,sat_str,str(xsize),str(ysize),file_format,str(iterations)]
    f_name = "_".join(cache_id)
    f_name = f_name.replace(" ","_")
    c_name = f_name
    cached_res = cache.get(c_name)
    if cached_res:
        return str(cached_res)
    f_name = os.path.join("/tilestore/tile_cache",f_name)
    tiles = list_tiles(x=[x], y=[y],acq_min=StartDate,acq_max=EndDate,satellites=satellite,dataset_types=[DatasetType.ARG25,DatasetType.PQ25], sort=SortType.ASC)
    tile_metadata = None
    tile_count = 0
    tile_filled = False
    for tile in tiles:
        if tile_filled:
           break
        print "merging on tile "+str(tile.x)+", "+str(tile.y)
        tile_count+=1
        dataset =  DatasetType.ARG25 in tile.datasets and tile.datasets[DatasetType.ARG25] or None
        if dataset is None:
            print "No dataset availible"
            tile_count-=1
            continue
        tile_metadata = get_dataset_metadata(dataset)
        if tile_metadata is None:
            print "NO METADATA"
            tile_count-=1
            continue
        pqa = DatasetType.PQ25 in tile.datasets and tile.datasets[DatasetType.PQ25] or None
        mask = None
        mask = get_mask_pqa(pqa,[PqaMask.PQ_MASK_CLEAR],mask=mask)

        band_data = get_dataset_data_masked(dataset, mask=mask,bands=bands)
        swap_arr = None
        for band in band_data:
            if not band in best_data:
                print "Adding "+band.name
                bd = resize_array(band_data[band],(2000,2000))
                print bd
                best_data[band]=bd
                del bd
            else:
                best = resize_array(best_data[band],(2000,2000))
               
                swap_arr=numpy.in1d(best.ravel(),-999).reshape(best.shape)
                b_data = numpy.array(band_data[band])
                best[swap_arr]=b_data[swap_arr]
                best_data[band]=numpy.copy(best)
                del b_data
                del best
        del swap_arr
        if iterations > 0:
            if tile_count>iterations:
                print "Exiting after "+str(iterations)+" iterations"
                break
    numberOfBands=len(bands)
    if numberOfBands == 0:
       return "None"
    if bands[0] not in best_data:
       print "No data was merged for "+str(x)+", "+str(y)
       return "None"
    numberOfPixelsInXDirection=len(best_data[bands[0]])
    numberOfPixelsInYDirection=len(best_data[bands[0]][0])   
    if tile_count <1:
        print "No tiles found for "+str(x)+", "+str(y)
        return "None"
    driver = gdal.GetDriverByName(file_format)
    if driver is None:
        print "No driver found for "+file_format
        return "None"
    print f_name+'.tif'
    raster = driver.Create(f_name+'.tif', numberOfPixelsInXDirection, numberOfPixelsInYDirection, numberOfBands, data_type, options=["BIGTIFF=YES", "INTERLEAVE=BAND"])
    gt = tile_metadata.transform
    gt2 = (gt[0],gt[1]*2.0,gt[2],gt[3],gt[4],gt[5]*2.0)
    tile_metadata.transform = gt2
    raster.SetGeoTransform(tile_metadata.transform)
    print tile_metadata.transform
    raster.SetProjection(tile_metadata.projection)
    index = 1
    for band in bands:
        stack_band = raster.GetRasterBand(index)
        stack_band.SetNoDataValue(-999)
        stack_band.WriteArray(best_data[band])
        stack_band.ComputeStatistics(True)
        index+=1
        stack_band.FlushCache()
        del stack_band
    raster.FlushCache()
    del raster
    cache.set(c_name,f_name+".tif")
    return f_name+".tif"

    

import hashlib
#TODO: Implement proper masking support
@celery.task()
def obtain_file_from_math(input_file,expressions_list,file_format="GTiff",data_type=gdal.GDT_CFloat32,input_ndv=-999,output_ndv=-999):
    """
    ex. band4,band3, (band4-band3)/(band4+band3) AKA NDVI
    """
    """
    Read in file
    """
    if input_file == "None":
        return "None"
    driver = gdal.GetDriverByName(file_format)
    ds = gdal.Open(input_file,0)
    if ds is None:
        return "None"
    arrays = []
    
    band_count = ds.RasterCount
    xsize = ds.RasterXSize
    ysize = ds.RasterYSize
    gt = ds.GetGeoTransform()
    proj = ds.GetProjection()
    exp_str = "_".join(expressions_list)
    cache_id = [os.path.splitext(os.path.basename(input_file))[0],exp_str,str(xsize),str(ysize),file_format]
    f_name = "_".join(cache_id)
    f_name = hashlib.sha512(f_name).hexdigest()[0:32]
    c_name = f_name
    cached_res = cache.get(c_name)
    if cached_res:
        return cached_res
    f_name = os.path.join("/tilestore/tile_cache",f_name)
    for i in range(band_count):
        RB = ds.GetRasterBand(i+1)
        arrays.append(RB.ReadAsArray(0,0,xsize,ysize).astype(numpy.float32))
        del RB
    
    var_identifier = "A"+''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(10))
    #test if we've used this id in this scope
    var_test = var_identifier+"_band1"
    while var_test in globals():
        var_identifier = "A"+''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(10))
        var_test = var_identifier+"_band1"
    for band_num in range(len(arrays)):
        globals()[var_identifier+'_band'+str(band_num+1)]=arrays[band_num]
    results = []
    expressions = [expression.replace("band",var_identifier+"_band") for expression in expressions_list]
    for expression in expressions:
        results.append(ne.evaluate(expression))
    
    raster = driver.Create(f_name+'.tif', xsize, ysize, len(expressions_list), data_type, options=["BIGTIFF=YES", "INTERLEAVE=BAND"])
    raster.SetGeoTransform(gt)
    raster.SetProjection(proj)
    index = 1
    for band in results:
        stack_band = raster.GetRasterBand(index)
        stack_band.SetNoDataValue(output_ndv)
        stack_band.WriteArray(band)
        stack_band.ComputeStatistics(True)
        index+=1
        stack_band.FlushCache()
        del stack_band
    raster.FlushCache()
    del raster
    del ds
    del results
    cache.set(c_name,f_name+".tif")
    return f_name+".tif"
    

@celery.task()
def shrink_raster_file(input_file,size=(2000,2000)):
    if len(size)!=2:
        return "None"
    if input_file=="None":
        return "None"
    file_name = os.path.splitext(os.path.basename(input_file))[0]
    if size[0] ==0 or size[1]==0:
        return "None"
    gdal.AllRegister()
    c_arr = [file_name,str(size)]
    c_name = "_".join(c_arr)
    c_name = c_name.replace(" ","_")
    c_name = c_name.replace(",","")
    c_name = c_name.replace("(","")
    c_name = c_name.replace(")","")
    f_name = c_name+".tif"
    f_name = os.path.join("/tilestore/tile_cache",f_name)
    ds = gdal.Open(input_file,0)
    band_count = ds.RasterCount
    if band_count == 0:
        return "None"
    xsize = ds.RasterXSize
    ysize = ds.RasterYSize
    gt = ds.GetGeoTransform()
    proj = ds.GetProjection()
    ndv = ds.GetRasterBand(1).GetNoDataValue()
    dt = ds.GetRasterBand(1).DataType
    bands = []
    for i in range(band_count):
        RB = ds.GetRasterBand(i+1)
        r = numpy.array(RB.ReadAsArray(0,0,xsize,ysize)).astype(numpy.float32)
        print r
        i = Image.fromarray(r)
        i2 = i.resize(size,Image.NEAREST)
        bands.append(numpy.array(i2))
        del i2
        del i
        del r
    driver = gdal.GetDriverByName("GTiff")
    raster = driver.Create(f_name, size[0], size[1], band_count, dt, options=["BIGTIFF=YES", "INTERLEAVE=BAND"])
    raster.SetGeoTransform(gt)
    raster.SetProjection(proj)
    index = 1
    for band in bands:
        stack_band = raster.GetRasterBand(index)
        stack_band.SetNoDataValue(ndv)
        stack_band.WriteArray(band)
        stack_band.ComputeStatistics(True)
        index+=1
        stack_band.FlushCache()
        del stack_band
    raster.FlushCache()
    del raster
    return f_name

@celery.task()
def merge_files_on_value(input_files_list,merge_value=-999, input_ndv=-999,output_ndv=-999):
    input_files = input_files_list
    input_files = [fl for fl in input_files if fl != "None"]
    if len(input_files)<2:
        if len(input_files)==1:
            return input_files[0]
        else:
            return "None"
    
    file_name_list = [os.path.splitext(os.path.basename(in_file))[0] for in_file in input_files]
    file_names_str = "_".join(file_name_list)
    c_name_arr = [file_names_str,str(merge_value),str(input_ndv),str(output_ndv)]
    c_name= "_".join(c_name_arr)
    f_name = c_name+".tif"
    f_name = os.path.join("/tilestore/tile_cache",f_name)
    gdal.AllRegister()
    arrays = []
    ds = None
    ndv_array = None
    swap_array = None
    xsize = 0
    ysize = 0
    gt = None
    proj = None
    band_count = 0
    ds = gdal.Open(file_path,0)
    gt = ds.GetGeoTransform()
    proj = ds.GetProjection()
    band_count = ds.RasterCount
    xsize = ds.RasterXSize
    ysize = ds.RasterYSize
    """
    Load the first file
    """
    for i in range(band_count):
        RB = ds.GetRasterBand(i+1)
        arrays.append(RB.ReadAsArray(0,0,xsize,ysize))
        del RB
        ds = None
    for file_path in input_files[1:]:
        ds = gdal.Open(file_path,0)
        if ds.RasterCount == band_count:
            for i in range(band_count):
                RB = ds.GetRasterBand(i+1)
                RA = RB.ReadAsArray(0,0,xsize,ysize)
                ndv_array = numpy.in1d(arrays[0].ravel(),ndv).reshape(arrays[0].shape)
                swap_array = numpy.in1d(arrays[0].ravel(),merge_value).reshape(arrays[0].shape)
                arrays[i][swap_array]=RA[swap_array]
                arrays[i][ndv_array]=output_ndv
                del RB
                del RA
                ndv_array = None
                swap_array = None
        ds = None
        
    """
    Write the merged file
    """
    raster = driver.Create(f_name+'.tif', xsize, ysize, band_count, gdal.GDT_CFloat32, options=["BIGTIFF=YES", "INTERLEAVE=BAND"])
    raster.SetGeoTransform(gt)
    raster.SetProjection(proj)
    index = 1
    for band in arrays:
        stack_band = raster.GetRasterBand(index)
        stack_band.SetNoDataValue(output_ndv)
        stack_band.WriteArray(band)
        stack_band.ComputeStatistics(True)
        index+=1
        stack_band.FlushCache()
        del stack_band
    raster.FlushCache()
    del raster
    return f_name
        
        
        


@celery.task()
def merge_2files_on_value(input_file1, input_file2, merge_value=-999, input_ndv=-999,output_ndv=-999):
    driver = gdal.GetDriverByName(file_format)
    ds1 = gdal.Open(input_file1,0)
    if ds1 is None:
        return "None"
    ds2 = gdal.Open(input_file2,0)
    if ds2 is None:
        return "None"
    arrays1 = []
    arrays2 = []
    band_count = ds1.RasterCount
    xsize = ds1.RasterXSize
    ysize = ds1.RasterYSize
    gt = ds1.GetGeoTransform()
    proj = ds1.GetProjection()
    for i in range(band_count):
        RB = ds1.GetRasterBand(i+1)
        arrays1.append(RB.ReadAsArray(0,0,xsize,ysize))
        del RB
    for i in range(band_count):
        RB = ds2.GetRasterBand(i+1)
        arrays2.append(RB.ReadAsArray(0,0,xsize,ysize))
        del RB
    for i in arrays1:
        ndv_array = numpy.in1d(arrays1[0].ravel(),ndv).reshape(arrays1[0].shape)
        swap_array = numpy.in1d(arrays1[0].ravel(),merge_value).reshape(arrays1[0].shape)
        arrays1[i][swap_array]=arrays2[i][swap_array]
        arrays1[i][ndv_array]=output_ndv
        del ndv_array
        del swap_array
    del arrays2
    cache_id = [os.path.splitext(os.path.basename(input_file1))[0],os.path.splitext(os.path.basename(input_file2))[0],str(merge_value),str(input_ndv),str(output_ndv)]
    f_name = "_".join(cache_id)
    f_name = hashlib.sha512(f_name).hexdigest()[0:32]
    f_name = os.path.join("/tilestore/tile_cache",f_name)
    raster = driver.Create(f_name+'.tif', xsize, ysize, band_count, data_type, options=["BIGTIFF=YES", "INTERLEAVE=BAND"])
    raster.SetGeoTransform(gt)
    raster.SetProjection(proj)
    index = 1
    for band in arrays1:
        stack_band = raster.GetRasterBand(index)
        stack_band.SetNoDataValue(output_ndv)
        stack_band.WriteArray(band)
        stack_band.ComputeStatistics(True)
        index+=1
        stack_band.FlushCache()
        del stack_band
    raster.FlushCache()
    del raster
    del ds1
    del ds2
    return f_name+".tif"


